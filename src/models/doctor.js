const mongoose = require('mongoose')
const validator = require('validator')

const doctorSchema = new mongoose.Schema({
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
    specialty:{
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
    dispoHourStart:{
        type : Date
    },
    dispoHourEnd:{
        type : Date
    },
    workDays:{
        type : String,
    },
    updatedAt:{
        type : Date,
        trim:true,
        default: Date.now
    },
    medicalLicenseNumber:{
        type : String,
        trim:true
    },
    fee:{
        type : Number
    },
    startWorkDate: {
        type : Date
    },
    owner:{
        type: mongoose.Schema.Types.ObjectId,
        required :true,
        ref: 'User'
    }
})

doctorSchema.virtual('appointments',{
    ref: 'Appointment',
    localField: '_id',
    foreignField: 'doctor'
})

doctorSchema.virtual('notes',{
    ref: 'Notes',
    localField: '_id',
    foreignField: 'doctor'
})

doctorSchema.virtual('perscriptions',{
    ref: 'Perscription',
    localField: '_id',
    foreignField: 'doctor'
})

doctorSchema.virtual('analyses',{
    ref: 'Analysis',
    localField: '_id',
    foreignField: 'doctor'
})


doctorSchema.statics.findByUser = async (id) => {
    const doctor = await Doctor.findOne({ owner: id })

    if(!doctor){
        throw new Error('Unable to find Doctor')
    }
    
    return doctor
}


const Doctor = mongoose.model('Doctor',doctorSchema)

module.exports = Doctor