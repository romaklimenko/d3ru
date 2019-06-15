const createError = require('http-errors')
const express = require('express')
const path = require('path')

const app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

// https
if (process.env.NODE_ENV === 'production') {
  app.use(require('./middlewares/https'));
}

app.use(require('morgan')('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(require('cookie-parser')())
app.use(require('node-sass-middleware')({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: true, // true = .sass and false = .scss
  sourceMap: true
}))
app.use(require('compression')())
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => res.render('index', { title: 'dirty' }))
app.get('/elections', (req, res) => res.render('elections', { title: 'выборы' }))
app.get('/tokens', (req, res) => res.render('tokens', { title: 'доступ' }))
app.get('/user', (req, res) => res.render('user', { title: 'пользователь' }))
app.get('/users', (req, res) => {
  // избегаем breaking changes: /users?user=romaklimenko редиректится на /user?user=romaklimenko
  if (req.query.user) {
    res.redirect(req.url.replace('/users', '/user'))
  }
  else {
    res.render('users', { title: 'сравнение пользователей' })
  }
})

app.get('/notes', (req, res) => res.render('notes', { title: 'заметки' }))

app.use('/ajax', require('./routes/ajax'))
app.use('/api', require('./routes/api'))

app.use((req, res, next) => next(createError(404)))

app.use((err, req, res) => {
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}
  res.status(err.status || 500)
  res.render('error')
})

module.exports = app
