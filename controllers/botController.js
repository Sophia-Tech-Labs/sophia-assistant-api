const makeWASocket = require("baileys");
const p = require("pino");
const botController={
	async pair(req,res){
		const { num } = req.body;
		if(!num){
			res.status(400).json({
				status:400,
				error:"All Fields Are Required"
			})
		}
	}
}
