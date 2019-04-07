var express = require('express');
var router = express.Router();

/* GET elections page. */
router.get('/', function(req, res, next) {
  res.render('elections', { title: 'dirty' });
});

module.exports = router;
