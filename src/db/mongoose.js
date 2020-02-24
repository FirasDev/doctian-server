const mongoose = require('mongoose')

mongoose.connect('mongodb://localhost:27017/doctian-data',{
    useNewUrlParser :true,
    useCreateIndex:true
})
