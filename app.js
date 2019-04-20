const createError = require('http-errors')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const sassMiddleware = require('node-sass-middleware')
const compression = require('compression')

const indexRouter = require('./routes/index')
const electionsRouter = require('./routes/elections')
const usersRouter = require('./routes/users')

const ajaxLastVotesRouter = require('./routes/ajax/democracy/last-votes')
const apiUsers = require('./routes/api/users')

const app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

// https
if (process.env.NODE_ENV == 'production') {
  app.use((req, res, next) => {
      res.setHeader('Strict-Transport-Security', 'max-age=8640000; includeSubDomains')
      if (req.headers['X-Forwarded-Proto'] && req.headers['X-Forwarded-Proto'] === "http") {
        return res.redirect(301, 'https://' + req.host + req.url)
      } else {
        return next()
      }
  });
}

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: true, // true = .sass and false = .scss
  sourceMap: true
}))
app.use(compression())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', indexRouter)
app.use('/elections', electionsRouter)
app.use('/users', usersRouter)

app.use('/ajax/democracy/last-votes', ajaxLastVotesRouter)

app.use('/api/users', apiUsers)

// catch 404 and forward to error handler
app.use((req, res, next) => next(createError(404)))

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

module.exports = app
