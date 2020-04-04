const mongoose = require('mongoose')
const validator = require('validator')


const analysisSchema = new mongoose.Schema({
    description:{
        type : String
    },
    status:{
        type : String,
        default:'Waiting',
        enum: ['Started', 'Ended','Rejected','Waiting'],
        required:true
    },
    category: {
        type : String,
        trim:true
    },
    dateAnalyse:{
        type : Date,
        default: Date.now
    },
    patient:{
        type: mongoose.Schema.Types.ObjectId,
        required :true,
        ref: 'Patient'
    },
    doctor:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor'
    },
    laboratory:{
        type: mongoose.Schema.Types.ObjectId,
        //required: true,
        ref: 'Laboratory'
    },
})

analysisSchema.virtual('analysisResults',{
    ref: 'analysisResult',
    localField: '_id',
    foreignField: 'analysis'
})

const Analysis = mongoose.model('Analysis',analysisSchema)

module.exports = Analysis