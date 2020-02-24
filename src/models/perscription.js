const mongoose = require('mongoose')
const validator = require('validator')

const perscriptionSchema = new mongoose.Schema({
    perscriptionDescription:{
        type : String,
        trim:true,
        required :true
    },
    ipfsUrl: {
        type : String,
        trim:true
    },
    patient:{
        type: mongoose.Schema.Types.ObjectId,
        required :true,
        ref: 'Patient'
    },
    doctor:{
        type: mongoose.Schema.Types.ObjectId,
        required :true,
        ref: 'Doctor'
    }
})

const Perscription = mongoose.model('Perscription',perscriptionSchema)

module.exports = Perscription