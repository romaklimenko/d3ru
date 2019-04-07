const https = require('https')
const express = require('express')
const router = express.Router()

router.get('/', (req, res, next) => {
  const url = new URL('https://d3.ru/ajax/democracy/last-votes/')

  const paramNames = ['domain', 'offset']

  for(let i = 0; i < paramNames.length; i++) {
    if (req.query[paramNames[i]] !== undefined) {
      url.searchParams.set(paramNames[i], req.query[paramNames[i]])
    }
  }

  const dirty_req = https.get(url, (dirty_res) => {
    if (dirty_res.statusCode != 200) {
      res.writeHead(dirty_res.statusCode)
      res.end()
    }

    dirty_res.on('data', chunk => res.write(chunk))
    dirty_res.on('end', () => res.end())
    dirty_res.on('close', () => res.end())
  })

  dirty_req.on('error', (e) => {
    console.log(e.message)
    res.writeHead(500)
    res.end()
  })

  dirty_req.end()
})

module.exports = router
