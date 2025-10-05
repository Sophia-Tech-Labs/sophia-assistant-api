const pino = require("pino");
const {
  default: makeWASocket,
  DisconnectReason,
  delay,
  Browsers,
} = require("baileys");
const { useMainSQLAuthState } = require("../lib/premiumAuth");
const NodeCache = require("node-cache");
const Boom = require("@hapi/boom");
const db = require("../db/db");
const qrcode = require("qrcode");
const msgRetryCounterCache = new NodeCache();
const trueBool = process.env.PROJECT_TYPE === "prod" ? true : 1;
const falseBool = process.env.PROJECT_TYPE === "prod" ? false : 0;
let sock;
async function mainPairCodeG(req, res) {
  const users = await db.query("SELECT api_key FROM users WHERE id = $1", [
    req.user.id,
  ]);
  const apikey = users[0].api_key;

  // ✅ FIX: Query premium_details table for premium connection status
  const userStatus = await db.query(
    "SELECT p.is_premium_linked, s.plan FROM premium_details p JOIN subscriptions s ON p.user_id = s.user_id JOIN users u ON p.user_id = u.id WHERE u.api_key = $1",
    [apikey]
  );

  const isConnected = userStatus[0]?.is_premium_linked;
  const isPremium = userStatus[0]?.plan !== 'lite'; // Check if plan is not lite

  if (!isPremium) {
    return res.status(403).json({
      status: 403,
      message: "User is Not premium.. Access Denied"
    });
  }

  let num = await db.query(
    "SELECT main_phone FROM users WHERE api_key = $1",
    [apikey]
  );

  if (num.length === 0) {
    return res.status(403).json({
      status: 403,
      message: "ApiKey not Valid",
    });
  }
  
  if (isConnected) {
    res.json({
      status: 200,
      message: "Premium Bot is already connected",
      connected: true,
    });
    return;
  }
  
  num = num[0].main_phone;

  async function initializePairingSession() {
    try {
      const { state, saveCreds } = await useMainSQLAuthState(apikey);
      if(process.env.CHANGE_WEB ==="true"){
        const { default: nodeFetch, Request, Response, Headers } = await import('node-fetch')
      const axiosModule = await import('axios')
      const axios = axiosModule.default

      const WA_PROXY_BASE = process.env.WA_PROXY_URL || 'https://wa-proxy-mg0c.onrender.com'

      global.fetch = async (targetUrl, options = {}) => {
        try {
          const host = new URL(targetUrl).hostname
          const whatsappDomains = ['mmg.whatsapp.net', 'pps.whatsapp.net', 'media.whatsapp.net', 'cdn.whatsapp.net', 'web.whatsapp.com']
          const useProxy = whatsappDomains.some(d => host.includes(d))

          if (!useProxy) {
            return nodeFetch(targetUrl, options)
          }

          const proxyUrl = `${WA_PROXY_BASE}/proxy?url=${encodeURIComponent(targetUrl)}`
          const proxyHeaders = {
            ...(options.headers || {}),
            'x-wa-proxy-key': 'NEXUS'
          }
          return nodeFetch(proxyUrl, { ...options, headers: proxyHeaders })
        } catch (e) {
          console.error('[fetch proxy error]', e)
          return nodeFetch(targetUrl, options)
        }
      }

      global.Request = Request
      global.Response = Response
      global.Headers = Headers

      axios.interceptors.request.use(cfg => {
        try {
          if (!cfg.url) return cfg
          const urlObj = new URL(cfg.url)
          const host = urlObj.hostname
          const whatsappDomains = ['mmg.whatsapp.net', 'pps.whatsapp.net', 'media.whatsapp.net', 'cdn.whatsapp.net', 'web.whatsapp.com']
          const useProxy = whatsappDomains.some(d => host.includes(d))
          if (useProxy) {
            const proxyUrl = `${WA_PROXY_BASE}/proxy?url=${encodeURIComponent(cfg.url)}`
            cfg.url = proxyUrl
            cfg.baseURL = undefined
            cfg.headers = {
              ...(cfg.headers || {}),
              'x-wa-proxy-key': 'NEXUS'
            }
            delete cfg.httpAgent
            delete cfg.httpsAgent
          }
        } catch (err) {
          console.warn('axios proxy rewrite failed', err.message)
        }
        return cfg
      }, e => Promise.reject(e))
      
     sock = makeWASocket({
        logger: pino({ level: "silent" }),
        auth: state,
        waWebSocketUrl: 'wss://wa-proxy-mg0c.onrender.com/wa-proxy',
        logger: pino({ level: "silent" }).child({ level: "fatal" }),
        browser: Browsers.macOS("Safari"),
        markOnlineOnConnect: true,
      })

      } else {
         sock = makeWASocket({
           auth: state,
           logger: pino({ level: "silent" }).child({ level: "fatal" }),
           browser: Browsers.macOS("Safari"),
            ...(process.env.CHANGE_WEB === "true" && { waWebSocketUrl: webUrl }),
           markOnlineOnConnect: true,
           msgRetryCounterCache,
         });
      }
      // If not registered OR not connected in DB, generate new pairing code
      if (!sock.authState.creds.registered && !isConnected) {
        console.log("Requesting premium pairing code...");
        await delay(1500);
        const formNum = num.replace(/[^0-9]/g, "");
        var code = await sock.requestPairingCode(formNum);
        if (!res.headersSent) {
          res.send({ code: code?.match(/.{1,4}/g)?.join("-") });
        }
      } else {
        // Already registered and connected
        if (!res.headersSent) {
          res.json({
            status: 200,
            message: "Premium Bot is already connected",
            connected: true,
          });
        }
      }

      sock.ev.on("creds.update", async () => {
        await saveCreds();
      });

      sock.ev.on("connection.update", async (update) => {
        try {
          const { connection, lastDisconnect } = update;
          if (connection === "open") {
            await delay(5000);
            
            // ✅ FIX: Update premium_details table instead of users
            await db.query(
              "UPDATE premium_details SET premium_bot_status = $1 FROM users WHERE premium_details.user_id = users.id AND users.api_key = $2",
              ["connecting", apikey]
            );
            
            // ✅ FIX: Update is_premium_linked in premium_details table
            await db.query(
              "UPDATE premium_details SET is_premium_linked = $1, last_premium_connected = $2 FROM users WHERE premium_details.user_id = users.id AND users.api_key = $3",
              [trueBool, new Date().toISOString(), apikey]
            );
            
            await sock.end();
          } else if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log("❌ Premium connection closed:", reason);

            if (reason === DisconnectReason.restartRequired) {
              console.log("♻️ Restart required, reconnecting...");
              initializePairingSession(); // call your session function again
            } else {
              // ✅ FIX: Update disconnection status in premium_details table
              await db.query(
                "UPDATE premium_details SET premium_bot_status = $1, is_premium_linked = $2 FROM users WHERE premium_details.user_id = users.id AND users.api_key = $3",
                ["inactive", falseBool, apikey]
              );
            }
          }
        } catch (error) {
          console.error(
            "⚠️ Connection.update error caught(premium pairing section): ",
            error
          );
        }
      });
    } catch (error) {
      console.error("Premium Pairing Error ", error);
    }
  }
  initializePairingSession();
}

async function generateMainQRCode(req, res) {
  const users = await db.query("SELECT api_key FROM users WHERE id = $1", [
    req.user.id,
  ]);
  const apikey = users[0].api_key;

  // ✅ FIX: Query premium_details and subscriptions tables for status
  const userStatus = await db.query(
    "SELECT p.is_premium_linked, s.plan FROM premium_details p JOIN subscriptions s ON p.user_id = s.user_id JOIN users u ON p.user_id = u.id WHERE u.api_key = $1",
    [apikey]
  );

  const isConnected = userStatus[0]?.is_premium_linked;
  const isPremium = userStatus[0]?.plan !== 'lite';

  if (!isPremium) {
    return res.status(403).json({
      status: 403,
      message: "User is Not premium.. Access Denied"
    });
  }

  if (isConnected) {
    res.json({
      status: 200,
      message: "Premium Bot is already connected",
      connected: true,
    });
    return;
  }
  
  async function initializeQRSession() {
    try {
      const { state, saveCreds } = await useMainSQLAuthState(apikey);
      const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }).child({ level: "fatal" }),
        browser: Browsers.macOS("Safari"),
        markOnlineOnConnect: true,
         ...(process.env.CHANGE_WEB === "true" && { waWebSocketUrl: webUrl }),
        msgRetryCounterCache,
        printQRInTerminal: false,
      });

      if (!sock.authState.creds.registered || !isConnected) {
        console.log("Generating premium QR code...");

        sock.ev.on("connection.update", async (update) => {
          try {
            const { connection, lastDisconnect, qr } = update;

            if (qr && !res.headersSent) {
              try {
                const qrCodeDataURL = await qrcode.toDataURL(qr, {
                  errorCorrectionLevel: "M",
                  type: "image/png",
                  quality: 0.92,
                  margin: 1,
                  color: {
                    dark: "#000000",
                    light: "#FFFFFF",
                  },
                  width: 256,
                });

                res.json({
                  method: "qr_code",
                  qr: qrCodeDataURL,
                  message: "Scan this QR code with WhatsApp",
                });
              } catch (qrError) {
                console.error("QR generation error:", qrError);
                res.status(500).json({
                  status: 500,
                  error: "Failed to generate QR code",
                });
              }
            }

            if (connection === "open") {
              await delay(5000);
              
              // ✅ FIX: Update premium_details table instead of users
              await db.query(
                "UPDATE premium_details SET premium_bot_status = $1 FROM users WHERE premium_details.user_id = users.id AND users.api_key = $2",
                ["connecting", apikey]
              );
              console.log("Premium Status change Successful");
              
              // ✅ FIX: Update is_premium_linked in premium_details table
              await db.query(
                "UPDATE premium_details SET is_premium_linked = $1, last_premium_connected = $2 FROM users WHERE premium_details.user_id = users.id AND users.api_key = $3",
                [trueBool, new Date().toISOString(), apikey]
              );
              
              await sock.end();
            } else if (connection === "close") {
              const reason = lastDisconnect?.error?.output?.statusCode;
              console.log("❌ Premium connection closed:", reason);

              if (reason === DisconnectReason.restartRequired) {
                console.log("♻️ Restart required, reconnecting...");
                initializeQRSession();
              } else {
                // ✅ FIX: Update disconnection status in premium_details table
                await db.query(
                  "UPDATE premium_details SET premium_bot_status = $1, is_premium_linked = $2 FROM users WHERE premium_details.user_id = users.id AND users.api_key = $3",
                  ["inactive", falseBool, apikey]
                );
              }
            }
          } catch (error) {
            console.error(
              "⚠️ Connection.update error caught(premium qr section):",
              error
            );
          }
        });
      } else {
        if (!res.headersSent) {
          res.json({
            status: 200,
            message: "Premium Bot is already connected",
            connected: true,
          });
        }
      }

      sock.ev.on("creds.update", async () => {
        await saveCreds();
      });
    } catch (error) {
      console.error("Premium QR Error ", error);
      if (!res.headersSent) {
        res.status(500).json({
          status: 500,
          error: "Failed to generate QR code",
        });
      }
    }
  }
  initializeQRSession();
}

// ✅ FIX: Update clearUserSession to use premium_details table
async function clearUserSession(apiKey) {
  try {
    // Clear premium sessions and keys for this user
    await db.query(
      "DELETE FROM main_sessions WHERE user_id = (SELECT id FROM users WHERE api_key = $1)",
      [apiKey]
    );
    await db.query(
      "DELETE FROM main_keys WHERE user_id = (SELECT id FROM users WHERE api_key = $1)",
      [apiKey]
    );
    
    // ✅ FIX: Reset premium connection status in premium_details table
    await db.query(
      "UPDATE premium_details SET is_premium_linked = $1, premium_bot_status = $2, last_premium_connected = $3 FROM users WHERE premium_details.user_id = users.id AND users.api_key = $4",
      [falseBool, "inactive", "Never", apiKey]
    );
    
    console.log("Premium session cleared for user");
  } catch (error) {
    console.error("Error clearing premium session:", error);
  }
}

async function resetPremiumBotConnection(req, res) {
  try {
    const users = await db.query("SELECT api_key FROM users WHERE id = $1", [
      req.user.id,
    ]);
    const apikey = users[0].api_key;

    await clearUserSession(apikey);

    res.json({
      status: 200,
      message: "Premium Bot connection reset. You can now pair again.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      error: "Failed to reset connection",
    });
  }
}

async function getPremiumBotStatus(req, res) {
  try {
    // ✅ FIX: Query premium_details table for premium connection status
    const userInfo = await db.query(
      "SELECT p.is_premium_linked, p.premium_bot_status, s.plan FROM premium_details p JOIN subscriptions s ON p.user_id = s.user_id JOIN users u ON p.user_id = u.id WHERE u.id = $1",
      [req.user.id]
    );
    
    res.json({
      status: 200,
      connected: Boolean(userInfo[0].is_premium_linked),
      botStatus: userInfo[0].premium_bot_status,
      plan: userInfo[0].plan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      error: "An error Occured",
    });
  }
}

module.exports = {
  mainPairCodeG,
  getPremiumBotStatus,
  generateMainQRCode,
  resetPremiumBotConnection,
};