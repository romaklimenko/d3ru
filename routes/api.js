const express = require('express')
const router = express.Router()

const usersRouter = require('./api/users')

router.use(usersRouter)

module.exports = router