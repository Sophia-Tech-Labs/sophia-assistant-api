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
		} catch (error){
			res.status(403).json({
							status:403,
							error:"Invalid Or Expired Token"
						})
		}
	},

}
module.exports = authController;
