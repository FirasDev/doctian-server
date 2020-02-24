const mongoose = require('mongoose')
const validator = require('validator')

const paymentSchema = new mongoose.Schema({
    ammount:{
        type : Number,
        trim:true,
        required :true
    },
    paymentStatus:{
        type : String,
        default:'Patient',
        enum: ['Payed', 'Not Payed'],
        required:true
    }
})

const Payment = mongoose.model('Payment',paymentSchema)

module.exports = Payment