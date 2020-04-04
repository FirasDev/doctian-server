const express = require('express')
require('./db/mongoose')

const userRouter = require('./routers/user')
const doctorRouter = require('./routers/doctor')
const patientRouter = require('./routers/patient')
const pharmacyRouter = require('./routers/pharmacy')
const laboratoryRouter = require('./routers/laboratory')

const app = express()
const port = process.env.PORT || 3000

// /// GateWay
// app.use((req, res , next) => {
//     console.log(req.method , req.path)
//     next()
// })

app.use(express.json())

app.use(userRouter)
app.use(doctorRouter)
app.use(patientRouter)
app.use(pharmacyRouter)
app.use(laboratoryRouter)

app.listen(port,() =>{
    console.log('Server is up on port : ' + port)
})


const jwt = require('jsonwebtoken')