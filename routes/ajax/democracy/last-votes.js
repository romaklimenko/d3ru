const fetch = require('node-fetch')
const express = require('express')
const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const url = new URL('https://d3.ru/ajax/democracy/last-votes/')

    const paramNames = ['domain', 'offset']

    for(let i = 0; i < paramNames.length; i++) {
      if (req.query[paramNames[i]] !== undefined) {
        url.searchParams.set(paramNames[i], req.query[paramNames[i]])
      }
    }

    const response = await fetch(url)
    const json = await response.json()
    res.json(json)
  } catch (e) {
    console.error(e)
    res.status(500).send('здесь должно быть осмысленное сообщение об ошибке, но его нет')
  }
})

module.exports = router
