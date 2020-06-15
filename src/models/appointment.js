const mongoose = require('mongoose')
const validator = require('validator')

const appointmentSchema = new mongoose.Schema({
    appointmentDate:{
        type : Date,
        default : Date.now,
        require : true
    },
    appointmentStatus:{
        type : String,
        default:'Accepted',
        enum: ['Accepted', 'Rejected','Pending','Waiting'],
        required:true
    },
    detailsProvidedByPatient: {
        type : String,
        trim:true
    },
    changedStatus:{

    },
    payment:{
        type: mongoose.Schema.Types.ObjectId,
        //required :true,
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