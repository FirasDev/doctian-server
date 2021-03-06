const mongoose = require('mongoose')


const medicamentResponseSchema = new mongoose.Schema({
    state:{
        type : String,
        enum: ['Accepted', 'Rejected'],
        required:true
    },
    medicamentRequest:{
        type: mongoose.Schema.Types.ObjectId,
        required :true,
        ref: 'MedicamentRequest'
    },
    pharmacy:{
        type: mongoose.Schema.Types.ObjectId,
        required :true,
        ref: 'Pharmacy'
    },
    name:{
        type : String
    },
    address:{
        type : String
    },
    distance:{
        type : Number,
        default : 10.0
    }
})


const MedicamentResponse = mongoose.model('MedicamentResponse',medicamentResponseSchema)

module.exports = MedicamentResponse