const express = require('express')
const router = express.Router()

const lastVotesRouter = require('./ajax/democracy/last-votes')

router.use(lastVotesRouter)

module.exports = router