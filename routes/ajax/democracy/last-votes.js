const fetch = require('node-fetch')
const express = require('express')
const router = express.Router()

router.get('/democracy/last-votes', async (req, res) => {
  try {
    const url = new URL('https://d3.ru/ajax/democracy/last-votes/')

    const paramNames = ['domain', 'offset']

    for(let i = 0; i < paramNames.length; i++) {
      if (req.query[paramNames[i]] !== undefined) {
        url.searchParams.set(paramNames[i], req.query[paramNames[i]])
      }
    }

    url.searchParams.set('cache', Math.floor(new Date().getTime()/1000.0))

    const response = await fetch(url)
    const json = await response.json()
    res.json(json)
  } catch (e) {
    console.error(e)
    res.status(500).json({
      error: 'здесь должно быть осмысленное сообщение об ошибке, но его нет'
    })
  }
})

module.exports = router
