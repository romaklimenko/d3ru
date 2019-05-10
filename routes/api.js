const express = require('express')
const router = express.Router()

const bansRouter = require('./api/bans')
const usersRouter = require('./api/users')

router.use(bansRouter)
router.use(usersRouter)

module.exports = router