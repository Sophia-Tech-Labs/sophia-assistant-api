const jwt = require("jsonwebtoken");
	const authController = {
	async refreshToken(req,res){
		const refreshToken = req.cookies.refreshToken;
		if(!refreshToken){
			return res.status(400).json({
				status:400,
				error:"Refresh Token Required"
			});
		}
		try{
		const decoded = jwt.verify(refreshToken,process.env.JWT_SECRET);
		const accessToken = jwt.sign({id:decoded.id, name:decoded.name,email:decoded.email,role:decoded.role},process.env.JWT_SECRET,{expiresIn:"15m"});
		
		let bool;
		        if(process.env.PROJECT_TYPE === "prod"){
		        bool = true;
		        } else{
		        bool = false;
		        }
		        res.cookie('accessToken', accessToken, {
		              httpOnly: true,
		              secure: bool,
		              sameSite: 'lax',  
		              maxAge: 15 * 60 * 1000
		            });
		            res.status(200).json({
		            	status:200,
		            	role:decoded.role
		            })
		} catch (error){
			res.status(403).json({
							status:403,
							codeError:error.message,
							error:"Invalid Or Expired Token"
						})
		}
	},
	async checkToken(req,res){
		const token = req.cookies.accessToken;
		if(!token){
			res.status(400).json({
				status:400,
				error:"No Access Token, Access Denied"
			})
			return;
		}
		try{
			const decoded = jwt.verify(token,process.env.JWT_SECRET);
			res.status(200).json({
				status:200,
				role:decoded.role,
				message:"Token Verified"
			})
		} catch(error){
			res.status(403).json({
				status:403,
				codeError:error.message,
				error:"Token Invalid or Expired"
			})
		}


	},
	async logOut(req, res){
	  res.clearCookie('accessToken', {
	    httpOnly: true,
	    sameSite: 'lax',
	    secure: true,
	  });
	  res.clearCookie('refreshToken', {
	    httpOnly: true,
	    sameSite: 'lax',
	    secure: true,
	  });
	  res.status(200).json({ message: 'Logged out successfully' });
	}

}
module.exports = authController;
