const mongoose = require('mongoose')
const validator = require('validator')

const patientSchema = new mongoose.Schema({
    name:{
        type : String,
        trim:true,
        lowercase:true
    },
    lastName:{
        type : String,
        trim:true,
        lowercase:true
    },
    cin:{
        type : String,
        trim:true
    },
    nationality:{
        type : String,
        trim:true,
        lowercase:true
    },
    dateOfBirth:{
        type : Date,
    },
    cnssNumber:{
        type : String,
        trim:true
    },
    owner:{
        type: mongoose.Schema.Types.ObjectId,
        required :true,
        ref: 'User'
    }
})

patientSchema.virtual('appointments',{
    ref: 'Appointment',
    localField: '_id',
    foreignField: 'patient'
})

patientSchema.virtual('analyses',{
    ref: 'Analysis',
    localField: '_id',
    foreignField: 'patient'
})

patientSchema.virtual('notes',{
    ref: 'Notes',
    localField: '_id',
    foreignField: 'patient'
})

patientSchema.virtual('perscriptions',{
    ref: 'Perscription',
    localField: '_id',
    foreignField: 'patient'
})

patientSchema.virtual('medicamentRequests',{
    ref: 'MedicamentRequest',
    localField: '_id',
    foreignField: 'patient'
})



patientSchema.statics.findByUser = async (id) => {
    const patient = await Patient.findOne({ owner: id })

    if(!patient){
        throw new Error('Unable to find Patient')
    }
    
    return patient
}


const Patient = mongoose.model('Patient',patientSchema)

module.exports = Patient