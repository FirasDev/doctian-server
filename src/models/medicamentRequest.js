const mongoose = require('mongoose')


const medicamentRequestSchema = new mongoose.Schema({
    medicament:{
        type : String,
        
    },
    quantity:{
        type : String,
    },
    state:{
        type : String,
        default:'Pending',
        enum: ['Pending', 'Closed'],
        required:true
    },
    image:{
        type : String,
    },
    city:{
        type : String
    },
    date:{
        type : Date,
        default: Date.now
    },
    patient:{
        type: mongoose.Schema.Types.ObjectId,
        required :true,
        ref: 'Patient'
    },
    perscription:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Perscription'
    },
    response:{
        type : String
    },
    dateB:{
        type : Date
    }
})

medicamentRequestSchema.virtual('medicamentResponses',{
    ref: 'MedicamentResponse',
    localField: '_id',
    foreignField: 'medicamentRequest'
})

const MedicamentRequest = mongoose.model('MedicamentRequest',medicamentRequestSchema)

module.exports = MedicamentRequest