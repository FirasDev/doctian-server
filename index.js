const mongodb = require('mongodb')
const MongoClient = mongodb.MongoClient

const connectionURL = 'mongodb://localhost:27017'
const databaseName = 'doctrine-data'


MongoClient.connect(connectionURL,{ useNewUrlParser: true},(error,client) => {
    if(error){
        return console.log('Unable to connect to database!')
    }
    console.log('Connected Correctly!')
})