const jwt = require('jsonwebtoken')
const User = require('../models/user')


const auth = async (req , res, next) => {
    console.log(' ----> Auth Middleware Security RUN TEST')
    try {
        const token = req.header('Authorization').replace('Bearer ', '')
        
        const decoded = jwt.verify(token, 'x199103')
        const user = await User.findOne({_id: decoded._id, 'tokens.token': token })
        if(!user){
            throw new Error()
        }
        console.log(' -> User Email: ',user.email)
        console.log(' -> User Role: ',user.role)
        req.token = token
        req.user = user
        next()
    } catch (e) {
        res.status(401).send({error: 'Please authenticate.'})
    }
    
}

module.exports = auth