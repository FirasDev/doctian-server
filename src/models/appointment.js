const mongoose = require('mongoose')
const validator = require('validator')

const appointmentSchema = new mongoose.Schema({
    appointmentDate:{
        type : Date
    },
    appointmentStatus:{
        type : String,
        default:'Pending',
        enum: ['Accepted', 'Rejected','Pending','Waiting'],
        required:true
    },
    detailsProvidedByPatient: {
        type : String,
        trim:true
    },
    payment:{
        type: mongoose.Schema.Types.ObjectId,
        required :true,
        ref: 'Payment'
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

const Appointment = mongoose.model('Appointment',appointmentSchema)

module.exports = Appointment