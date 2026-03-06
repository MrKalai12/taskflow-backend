const jwt = require('jsonwebtoken');
const User = require("../models/User");
const authMiddleware =  async (req, res, next)=>{
    try{
        const authHeader = req.headers.authorization;
        if(!authHeader || !authHeader.startsWith('Bearer ')){
            return res.status(401).json({ message: 'Not authenticated'});
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            userId: decoded.userId,
            role: decoded.role,
            isBlocked: decoded.isBlocked
        };

        const user = await User.findById(req.user.userId);
        if(!user){
            return res.status(401).json({
            message: 'User does not exist'
        });
        }
        if(user.isBlocked){
            return res.status(403).json({
            message: 'Account is blocked'
        });
        }
        next();

    } catch(error){
        return res.status(401).json({
            message: 'Invalid or expired token'
        });
    };
};

module.exports = authMiddleware;