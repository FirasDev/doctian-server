const mongoose = require('mongoose')
const validator = require('validator')

const scanSchema = new mongoose.Schema({
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
})

const Scan = mongoose.model('scan', scanSchema)

module.exports = Scan