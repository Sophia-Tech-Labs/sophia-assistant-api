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
const db = require("../db/db");
const msgRetryCounterCache = new NodeCache();
async function pairCodeG(req, res) {
  const users = await db.query("SELECT api_key FROM users WHERE id = $1", [
    req.user.id,
  ]);
  console.log(users)

  const apikey = users[0].api_key;
  console.log(apikey)
  let num = await db.query(
    "SELECT assistant_phone FROM users WHERE api_key = $1",
    [apikey]
  );
  console.log(num)
  if (num.length === 0) {
    return res.status(403).json({
      status: 403,
      message: "ApiKey not Valid",
    });
  }
  num = num[0].assistant_phone;
  async function initializePairingSession() {
    try {
      const { state, saveCreds } = await useSQLAuthState(apikey);
      const sock = makeWASocket({
        auth: state,
        //  printQRInTerminal: false,
        logger: pino({ level: "silent" }).child({ level: "fatal" }),
        browser: Browsers.macOS("Safari"), //check docs for more custom options
        markOnlineOnConnect: true, //true or false yoour choice
        msgRetryCounterCache,
      });

      if (!sock.authState.creds.registered) {
        console.log("Requesting pairing code...");
        await delay(1500);
        const formNum = num.replace(/[^0-9]/g, "");
        var code = await sock.requestPairingCode(formNum);
        if (!res.headersSent) {
          res.send({ code: code?.match(/.{1,4}/g)?.join("-") });
        }
      }

      sock.ev.on("creds.update", async () => {
        await saveCreds();
      });
      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
          const trueBool = process.env.PROJECT_TYPE === "prod" ? true : 1;
          await delay(5000);
          await db.query("UPDATE users SET status = $1", ["connecting"]);
          await db.query("UPDATE users SET is_connected = $1", [trueBool]);
          await sock.end();
        } else if (connection === "close") {
          const reason = lastDisconnect?.error?.output?.statusCode;
          await db.query("UPDATE users SET status = $1", ["inactive"]);
          await reconn(reason);
        }
      });

      async function reconn(reason) {
        if (
          [
            DisconnectReason.connectionLost,
            DisconnectReason.connectionClosed,
            DisconnectReason.restartRequired,
          ].includes(reason)
        ) {
          console.log("Connection lost, reconnecting...");
          initializePairingSession();
        }
      }
    } catch (error) {
      console.error("Pairing Error ", error);
    }
  }
  initializePairingSession();
}

async function getBotStatus(req, res) {
  try {
    const userInfo = await db.query(
      "SELECT is_connected FROM users WHERE id = $1",
      [req.user.id]
    );
    res.json({
      status: 200,
      connected: Boolean(userInfo[0].is_connected),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      error: "An error Occured",
    });
  }
}

module.exports = { pairCodeG, getBotStatus };
