const mongoose = require('mongoose')


const laboratorySchema = new mongoose.Schema({
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

laboratorySchema.virtual('analyses',{
    ref: 'Analysis',
    localField: '_id',
    foreignField: 'laboratory'
})

laboratorySchema.statics.findByUser = async (id) => {
    const laboratory = await Laboratory.findOne({ owner: id })

    if(!laboratory){
        throw new Error('Unable to find Laboratory')
    }
    
    return laboratory
}

const Laboratory = mongoose.model('Laboratory',laboratorySchema)

module.exports = Laboratory