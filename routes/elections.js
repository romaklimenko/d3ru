const express = require('express')
const router = express.Router()

router.get('/', (req, res, next) => {
  res.render('elections', { title: 'dirty' });
})

module.exports = router
