const pino = require("pino");
const {
  default: makeWASocket,
  DisconnectReason,
  delay,
  Browsers,
  makeCacheableSignalKeyStore,
} = require("baileys");
const { useSQLAuthState } = require("../lib/auth");
const NodeCache = require("node-cache");
const Boom = require("@hapi/boom");
const db = require("../db/db");
const qrcode = require("qrcode");
const msgRetryCounterCache = new NodeCache();
const trueBool = process.env.PROJECT_TYPE === "prod" ? true : 1;
const falseBool = process.env.PROJECT_TYPE === "prod" ? false : 0;
const webUrl = "wss://wa-proxy-x.onrender.com/wa-proxy";

async function pairCodeG(req, res) {
  const users = await db.query("SELECT api_key FROM users WHERE id = $1", [
    req.user.id,
  ]);
  const apikey = users[0].api_key;

  // ✅ FIX: Query subscriptions table instead of users
  const userStatus = await db.query(
    "SELECT s.is_connected FROM subscriptions s JOIN users u ON s.user_id = u.id WHERE u.api_key = $1",
    [apikey]
  );

  const isConnected = userStatus[0]?.is_connected;
  let num = await db.query(
    "SELECT assistant_phone FROM users WHERE api_key = $1",
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
      message: "Bot is already connected",
      connected: true,
    });
    return;
  }
  num = num[0].assistant_phone;

  async function initializePairingSession() {
    try {
      const { state, saveCreds } = await useSQLAuthState(apikey);
      const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }).child({ level: "fatal" }),
        browser: Browsers.macOS("Safari"),
         ...(process.env.CHANGE_WEB === "true" && { waWebSocketUrl: webUrl }),
        markOnlineOnConnect: true,
        msgRetryCounterCache,
      });

      // If not registered OR not connected in DB, generate new pairing code
      if (!sock.authState.creds.registered && !isConnected) {
        console.log("Requesting pairing code...");
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
            message: "Bot is already connected",
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
            
            // ✅ FIX: Update subscriptions table instead of users
            await db.query(
              "UPDATE subscriptions SET bot_status = $1 FROM users WHERE subscriptions.user_id = users.id AND users.api_key = $2",
              ["connecting", apikey]
            );
            
            // ✅ FIX: Update is_connected in subscriptions table
            await db.query(
              "UPDATE subscriptions SET is_connected = $1, last_connected = $2 FROM users WHERE subscriptions.user_id = users.id AND users.api_key = $3",
              [trueBool, new Date().toISOString(), apikey]
            );
            
            await sock.end();
          } else if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log("❌ Connection closed:", reason);

            if (reason === DisconnectReason.restartRequired) {
              console.log("♻️ Restart required, reconnecting...");
              initializePairingSession(); // call your session function again
            } /* else {
              // ✅ FIX: Update disconnection status in correct tables
              await db.query(
                "UPDATE subscriptions SET bot_status = $1, is_connected = $2 FROM users WHERE subscriptions.user_id = users.id AND users.api_key = $3",
                ["inactive", falseBool, apikey]
              );
              
            } */
          }
        } catch (error) {
          console.error(
            "⚠️ Connection.update error caught(pairing section): ",
            error
          );
        }
      });
    } catch (error) {
      console.error("Pairing Error ", error);
    }
  }
  initializePairingSession();
}

async function generateQRCode(req, res) {
  const users = await db.query("SELECT api_key FROM users WHERE id = $1", [
    req.user.id,
  ]);

  const apikey = users[0].api_key;
  
  // ✅ FIX: Query subscriptions table instead of users
  const userStatus = await db.query(
    "SELECT s.is_connected FROM subscriptions s JOIN users u ON s.user_id = u.id WHERE u.api_key = $1",
    [apikey]
  );
  
  const isConnected = userStatus[0]?.is_connected;
  if (isConnected) {
    res.json({
      status: 200,
      message: "Bot is already connected",
      connected: true,
    });
    return;
  }
  
  async function initializeQRSession() {
    try {
      const { state, saveCreds } = await useSQLAuthState(apikey);
      const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }).child({ level: "fatal" }),
        browser: Browsers.macOS("Safari"),
         ...(process.env.CHANGE_WEB === "true" && { waWebSocketUrl: webUrl }),
        markOnlineOnConnect: true,
        msgRetryCounterCache,
        printQRInTerminal: false,
      });

      if (!sock.authState.creds.registered || !isConnected) {
        console.log("Generating QR code...");

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
              
              // ✅ FIX: Update subscriptions table instead of users
              await db.query(
                "UPDATE subscriptions SET bot_status = $1 FROM users WHERE subscriptions.user_id = users.id AND users.api_key = $2",
                ["connecting", apikey]
              );
              console.log("Status change Successful");
              
              // ✅ FIX: Update is_connected in subscriptions table
              await db.query(
                "UPDATE subscriptions SET is_connected = $1, last_connected = $2 FROM users WHERE subscriptions.user_id = users.id AND users.api_key = $3",
                [trueBool, new Date().toISOString(), apikey]
              );
              
              
              await sock.end();
            } else if (connection === "close") {
              const reason = lastDisconnect?.error?.output?.statusCode;
              console.log("❌ Connection closed:", reason);

              if (reason === DisconnectReason.restartRequired) {
                console.log("♻️ Restart required, reconnecting...");
                initializeQRSession();
              } else {
                // ✅ FIX: Update disconnection status in correct tables
                await db.query(
                  "UPDATE subscriptions SET bot_status = $1, is_connected = $2 FROM users WHERE subscriptions.user_id = users.id AND users.api_key = $3",
                  ["inactive", falseBool, apikey]
                );
               
              }
            }
          } catch (error) {
            console.error(
              "⚠️ Connection.update error caught(qr section):",
              error
            );
          }
        });
      } else {
        if (!res.headersSent) {
          res.json({
            status: 200,
            message: "Bot is already connected",
            connected: true,
          });
        }
      }

      sock.ev.on("creds.update", async () => {
        await saveCreds();
      });
    } catch (error) {
      console.error("QR Error ", error);
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

// ✅ FIX: Update clearUserSession to use correct tables
async function clearUserSession(apiKey) {
  try {
    // Clear sessions and keys for this user
    await db.query(
      "DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE api_key = $1)",
      [apiKey]
    );
    await db.query(
      "DELETE FROM keys WHERE user_id = (SELECT id FROM users WHERE api_key = $1)",
      [apiKey]
    );
    
    // ✅ FIX: Reset connection status in subscriptions table
    await db.query(
      "UPDATE subscriptions SET is_connected = $1, bot_status = $2, last_connected = $3 FROM users WHERE subscriptions.user_id = users.id AND users.api_key = $4",
      [falseBool, "inactive", "Never", apiKey]
    );
    
    console.log("Session cleared for user");
  } catch (error) {
    console.error("Error clearing session:", error);
  }
}

async function resetBotConnection(req, res) {
  try {
    const users = await db.query("SELECT api_key FROM users WHERE id = $1", [
      req.user.id,
    ]);
    const apikey = users[0].api_key;

    await clearUserSession(apikey);

    res.json({
      status: 200,
      message: "Bot connection reset. You can now pair again.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      error: "Failed to reset connection",
    });
  }
}

async function getBotStatus(req, res) {
  try {
    // ✅ FIX: Query subscriptions table for connection status
    const userInfo = await db.query(
      "SELECT s.is_connected, s.bot_status, p.is_premium_linked, p.premium_bot_status FROM subscriptions s LEFT JOIN premium_details p ON s.user_id = p.user_id JOIN users u ON s.user_id = u.id WHERE u.id = $1",
      [req.user.id]
    );
    
    res.json({
      status: 200,
      connected: Boolean(userInfo[0].is_connected),
      botStatus: userInfo[0].bot_status,
      premiumConnected: Boolean(userInfo[0].is_premium_linked),
      premiumBotStatus: userInfo[0].premium_bot_status,
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
  pairCodeG,
  getBotStatus,
  generateQRCode,
  resetBotConnection,
};