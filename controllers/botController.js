const pino = require("pino");
const { default: makeWASocket,DisconnectReason, delay,Browsers, makeCacheableSignalKeyStore } = require("baileys");
const { useSQLAuthState } = require("../lib/auth");
const NodeCache = require('node-cache');
const db = require("../db/db");
const msgRetryCounterCache = new NodeCache();
async function pairCodeG(req,res){
	const num = req.query.number;
	if(!num){
		return res.status(400).json({
			status:400,
			error:"Phone number is Required"
		})
	}
	async function initializePairingSession(){
	const email = "ayanokoji2306@gmail.com"
		const { state,saveCreds } = await useSQLAuthState(email);
		const sock = makeWASocket({
		        auth:state,
		         //  printQRInTerminal: false,
		        logger: pino({ level: 'debug' }).child({ level: 'fatal' }),
		        browser: Browsers.macOS("Safari"), //check docs for more custom options
		        markOnlineOnConnect: true, //true or false yoour choice
		        msgRetryCounterCache
		    });

		    if (!sock.authState.creds.registered) {
		    console.log("Requesting pairing code...");
		            await delay(1500);
		          const  formNum = num.replace(/[^0-9]/g, '');
		            var code = await sock.requestPairingCode(formNum);
		            if (!res.headersSent) {
		                res.send({ code: code?.match(/.{1,4}/g)?.join('-') });
		            }
		        }

		        sock.ev.on('creds.update', async () => {
		                await saveCreds();
		            });
		        sock.ev.on("connection.update", async(update)=>{
		        	const { connection, lastDisconnect } = update;
		        	if(connection === "open"){
		        	await delay(5000)
		        		await sock.end()
		        	}
		        	else if(connection === "close"){
		        		const reason = lastDisconnect?.error?.output?.statusCode;
		        		await reconn(reason);
		        	}
		        })

		       async  function reconn(reason) { 
		            if ([DisconnectReason.connectionLost, DisconnectReason.connectionClosed, DisconnectReason.restartRequired].includes(reason)) {
		                console.log('Connection lost, reconnecting...');
		                initializePairingSession();
		            } else {
		                console.log(`Disconnected! reason: ${reason}`);
		                const userID = await db.query("SELECT id FROM users WHERE email = $1",[email])
		                await db.query("DELETE FROM sessions WHERE user_id = $1",[userID])
		                
		                await sock.end();
		            }
		        }
	}
	initializePairingSession()
}

module.exports = {pairCodeG}
