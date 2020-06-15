const mongoose = require('mongoose')
const validator = require('validator')

const notesSchema = new mongoose.Schema({
    notesDetails: {
        type: String,
        trim: true,
        required: true
    },
    ipfsUrl: {
        type: String,
        trim: true
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Patient'
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Doctor'
    }
},{ strict: true })

const Notes = mongoose.model('Notes', notesSchema)

module.exports = Notes