const jwt = require('jsonwebtoken')
const User = require('../models/user')


const auth = async (req , res, next) => {
    console.log('auth middleware')
    try {
        const token = req.header('Authorization').replace('Bearer ', '')
        console.log(token)
        const decoded = jwt.verify(token, 'x199103')
        const user = await User.findOne({_id: decoded._id, 'tokens.token': token })
        if(!user){
            throw new Error()
        }
        console.log(token)
        req.token = token
        req.user = user
        next()
    } catch (e) {
        res.status(401).send({error: 'Please authenticate.'})
    }
    
}

module.exports = auth