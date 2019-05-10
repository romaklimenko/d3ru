const express = require('express')
const router = express.Router()

const fetch = require('node-fetch')

const getDomainBans = async (domain) => {
  const response = await fetch(`https://${domain}.d3.ru/bans/`)
  const text = await response.text()
  const json = JSON.parse(text.split('\n')[130].replace('            window.entryStorages[window.pageName] = ', ''))
  return json
}

router.get('/bans', async (req, res) => {
  try {
    let domain = req.query['domain']

    if (domain && domain.trim() !== '') {
      res.json(await getDomainBans(domain))
    }
    else {
      res.status(404).end()
    }
  } catch (e) {
    console.error(e)
    res.status(500).json({
      error: 'здесь должно быть осмысленное сообщение об ошибке, но его нет'
    })
  }
})

module.exports = router
