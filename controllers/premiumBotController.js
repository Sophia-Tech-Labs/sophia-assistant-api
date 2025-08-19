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

async function mainPairCodeG(req, res) {
  const users = await db.query("SELECT api_key FROM users WHERE id = $1", [
    req.user.id,
  ]);
  const apikey = users[0].api_key;

  const userStatus = await db.query(
        "SELECT * FROM users WHERE api_key = $1",
        [apikey]
      );

  const isConnected = userStatus[0]?.is_connected;
  const isPremium = userStatus[0].is_premium;

  if(!isPremium){
    return res.status(403).json({
      status:403,
      message:"User is Not premium.. Access Denied"
    })
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
  if(!isConnected){
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
      const { state, saveCreds } = await useMainSQLAuthState(apikey);
      const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }).child({ level: "fatal" }),
        browser: Browsers.macOS("Safari"),
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
            const trueBool = process.env.PROJECT_TYPE === "prod" ? true : 1;
            await delay(5000);
            await db.query("UPDATE users SET premium_status = $1 WHERE api_key = $2", [
              "connecting",
              apikey,
            ])
            await db.query(
              "UPDATE users SET is_premium_connected = $1 WHERE api_key = $2",
              [trueBool, apikey]
            );
            await sock.end();
          } else if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log("❌ Connection closed:", reason);
  
            if (reason === DisconnectReason.restartRequired) {
              console.log("♻️ Restart required, reconnecting...");
              initializePairingSession(); // call your session function again
             } 
          }
        } catch (error) {
          console.error("⚠️ Connection.update error caught(pairing section): ",error)
        }
      });

    } catch (error) {
      console.error("Pairing Error ", error);
    }
  }
  initializePairingSession();
}

async function generateMainQRCode(req, res) {
  const users = await db.query("SELECT api_key FROM users WHERE id = $1", [
    req.user.id,
  ]);
  const apikey = users[0].api_key;

const userStatus = await db.query(
        "SELECT * FROM users WHERE api_key = $1",
        [apikey]
      );

  const isConnected = userStatus[0]?.is_connected;
  const isPremium = userStatus[0].is_premium;

  if(!isPremium){
    return res.status(403).json({
      status:403,
      message:"User is Not premium.. Access Denied"
    })
  }

  async function initializeQRSession() {
    try {
      const { state, saveCreds } = await useMainSQLAuthState(apikey);
      const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }).child({ level: "fatal" }),
        browser: Browsers.macOS("Safari"),
        markOnlineOnConnect: true,
        msgRetryCounterCache,
        printQRInTerminal: false, // ✅ Don't print in terminal
      });

      // Check if already connected
      const userStatus = await db.query(
        "SELECT is_premium_connected FROM users WHERE api_key = $1",
        [apikey]
      );
      
      if (!sock.authState.creds.registered || !isConnected) {
        console.log("Generating QR code...");
        
        // Listen for QR code
        sock.ev.on("connection.update", async (update) => {
          try {
            const { connection, lastDisconnect, qr } = update;
      
            if (qr && !res.headersSent) {
              // ✅ Generate QR code as base64 image
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
                  qr: qrCodeDataURL, // base64 data URL
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
              await db.query("UPDATE users SET premium_status = $1 WHERE api_key = $2", [
                "connecting",
                apikey,
              ]);
              console.log("Status change Successful")
              await db.query(
                "UPDATE users SET is_connected = $1 WHERE api_key = $2",
                [trueBool, apikey]
              );
              await sock.end();
            } else if (connection === "close") {
              const reason = lastDisconnect?.error?.output?.statusCode;
              console.log("❌ Connection closed:", reason);
      
              if (reason === DisconnectReason.restartRequired) {
                console.log("♻️ Restart required, reconnecting...");
                initializeQRSession(); // call your session function again
              } 
            }
            
          } catch (error) {
            console.error("⚠️ Connection.update error caught(qr section):",error)
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

// ✅ Add this function to clear sessions
async function clearUserSession(apiKey) {
  try {
    // Clear sessions and keys for this user
    await db.query(
      "DELETE FROM main_sessions WHERE user_id = (SELECT id FROM users WHERE api_key = $1)",
      [apiKey]
    );
    await db.query(
      "DELETE FROM main_keys WHERE user_id = (SELECT id FROM users WHERE api_key = $1)",
      [apiKey]
    );
    // Reset connection status
    await db.query(
      "UPDATE users SET is_premium_connected = $1, premium_status = $2 WHERE api_key = $3",
      [falseBool, "inactive", apiKey]
    );
    console.log("Session cleared for user");
  } catch (error) {
    console.error("Error clearing session:", error);
  }
}

// ✅ Add endpoint to manually reset connection
async function resetPremiumBotConnection(req, res) {
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

async function getPremiumBotStatus(req, res) {
  try {
    const userInfo = await db.query(
      "SELECT is_premium_connected,status FROM users WHERE id = $1",
      [req.user.id]
    );
    res.json({
      status: 200,
      connected: Boolean(userInfo[0].is_connected),
      botStatus:userInfo[0].status
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
