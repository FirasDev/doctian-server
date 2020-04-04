const mongoose = require('mongoose')


const pharmaceuticalCompanySchema = new mongoose.Schema({
    name:{
        type : String,
        trim:true
    },
    dispoHourStart:{
        type : Date
       
    },
    dispoHourEnd:{
        type : Date
        
    },
    coverPicture:{
        type : String,
        default : 'cover.jpg',
        required:true
    },
    workDays:{
        type : String,
    },
    licenceNumber:{
        type : String,
        trim:true
    },
    owner:{
        type: mongoose.Schema.Types.ObjectId,
        required :true,
        ref: 'User'
    }
})

const PharmaceuticalCompany = mongoose.model('PharmaceuticalCompany',pharmaceuticalCompanySchema)

module.exports = PharmaceuticalCompany