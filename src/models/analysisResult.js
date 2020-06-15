const mongoose = require('mongoose')
const validator = require('validator')

const analysisResultSchema = new mongoose.Schema({
    description:{
        type : String,
        trim:true,
    },
    analysis:{
        type: mongoose.Schema.Types.ObjectId,
        required :true,
        ref: 'Analysis'
    },
    ipfsUrl:{
        type : String,
        trim:true
    }
})

const AnalysisResult = mongoose.model('AnalysisResult',analysisResultSchema)

module.exports = AnalysisResult