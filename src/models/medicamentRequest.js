const mongoose = require('mongoose')


const medicamentRequestSchema = new mongoose.Schema({
    medicament:{
        type : String,
        trim:true
    },
    state:{
        type : String,
        default:'Pending',
        enum: ['Pending', 'Closed'],
        required:true
    },
    patient:{
        type: mongoose.Schema.Types.ObjectId,
        required :true,
        ref: 'Patient'
    },
    perscription:{
        type: mongoose.Schema.Types.ObjectId,
        required :true,
        ref: 'Perscription'
    }
})

medicamentResponseSchema.virtual('medicamentResponses',{
    ref: 'MedicamentResponse',
    localField: '_id',
    foreignField: 'medicamentRequest'
})

const MedicamentRequest = mongoose.model('MedicamentRequest',medicamentRequestSchema)

module.exports = MedicamentRequest