const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const userSchema = new mongoose.Schema({
    email:{
        type : String,
        trim:true,
        lowercase:true,
        unique :true,
        required :true,
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error('Email is Invalid')
            }
        }
    },
    password:{
        type : String,
        minlength:7,
        trim:true,
        required:true
        
    },
    role:{
        type : String,
        default:'Patient',
        enum: ['Patient', 'Doctor','Laboratory','Pharmacy','Pharmaceutical company'],
        required:true
    },
    avatar:{
        type : String,
        default : 'avatar.jpg',
        required:true
    },
    phoneNumber:{
        type : String
    },
    city:{
        type : String
    },
    address:{
        type : String
    },
    zipCode:{
        type : String
    },
    keyCarte:{
        type : String
    },
    activated:{
        type : Boolean,
        default : false,
        required: true
    },
    tokens: [{
        token: {
            type : String,
            required: true
        }
    }]
})

//

userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email })

    if(!user){
        throw new Error('Unable to login')
    }

    const isMatch = await bcrypt.compare(password,user.password)

    if(!isMatch){
        throw new Error('Unable to login')
    }

    return user
}



// Hash the Password Before Saving
userSchema.pre('save', async function (next) {
    const user = this

    if (user.isModified('password')){
        user.password = await bcrypt.hash(user.password, 8)
    }
    next()
})

//

userSchema.methods.generateAuthToken = async function(){
    const user = this 
    const token = jwt.sign({ _id: user._id.toString() }, 'x199103')
    
    user.tokens = user.tokens.concat({ token })
    await user.save()
    
    return token
}

const User = mongoose.model('User',userSchema)

module.exports = User