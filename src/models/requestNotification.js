const mongoose = require('mongoose')


const requestNotificationSchema = new mongoose.Schema({
    state:{
        type : String   
    },
    patient:{
        type : String   
    },
    
    
})


const requestNotification = mongoose.model('requestNotification',requestNotificationSchema)

module.exports = requestNotification