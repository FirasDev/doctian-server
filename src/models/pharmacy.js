const mongoose = require('mongoose')
const validator = require('validator')


const pharmacySchema = new mongoose.Schema({
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



pharmacySchema.virtual('medicamentResponses',{
    ref: 'MedicamentResponse',
    localField: '_id',
    foreignField: 'Pharmacy'
})



pharmacySchema.statics.findByUser = async (id) => {
    const pharmacy = await Pharmacy.findOne({ owner: id })

    if(!pharmacy){
        throw new Error('Unable to find Pharmacy')
    }
    
    return pharmacy
}


const Pharmacy = mongoose.model('Pharmacy',pharmacySchema)

module.exports = Pharmacy