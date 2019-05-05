const httpsMiddleware = (req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=8640000; includeSubDomains')
  if (req.headers['X-Forwarded-Proto'] && req.headers['X-Forwarded-Proto'] === "http") {
    return res.redirect(301, 'https://' + req.host + req.url)
  } else {
    return next()
  }
}

module.exports = httpsMiddleware