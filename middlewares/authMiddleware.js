const jwt = require("jsonwebtoken");
const middlewares = {

async verifySuperAdmin(req,res,next){
	const token = req.cookies.accessToken;
	if(!token){
		return res.status(401).json({
			error:"No access Token, Access Denied"
		});
	}
	try{
	const decodedUser = jwt.verify(token,process.env.JWT_SECRET);
	req.user = decodedUser;
	if(decodedUser.role !== "super-admin"){
		return res.status(401).json({
		status:401,
		error:"Access Denied"
		})
	}
	next()
	} catch(error){
		res.status(403).json({
			status:403,
			error:"Invalid or Expired Token"
		})
		return;
	}
},
async verifyAdmin(req,res,next){
	const token = req.cookies.accessToken;
	if(!token){
		return res.status(401).json({
			error:"No access Token, Access Denied"
		});
	}
	try{
	const decodedUser = jwt.verify(token,process.env.JWT_SECRET);
	req.user = decodedUser;
	if(decodedUser.role !== "admin"){
		return res.status(401).json({
		status:401,
		error:"Access Denied"
		})
	}
	next()
	} catch(error){
		res.status(403).json({
			status:403,
			error:"Invalid or Expired Token"
		})
		return;
	}
},

}
module.exports = middlewares
