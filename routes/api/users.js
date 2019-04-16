const express = require('express')
const router = express.Router()

const fetch = require('node-fetch')

const cache = require('../../middleware/cache')

const activityMapper = a => {
  return {
    domain: a.domain ? a.domain.prefix : '',
    rating: a.rating ? a.rating : 0,
    created: a.created,
    id: a.id
  }
}

const getActivities = async (user, type) => {
  let page = 1
  let pageCount = null

  const url = new URL(`https://d3.ru/api/users/${user}/${type}/`)
  const activities = []

  while (pageCount === null || page <= pageCount) {
    url.searchParams.set('page', page)
    const response = await (await fetch(url)).json()
    pageCount = pageCount || response.page_count
    activities.push(...response[type].map(activityMapper))
    page++
  }

  activities.sort((a, b) => a.created < b.created ? 1 : -1)
  return activities
}

router.use(cache(60 * 60 * 24 * 7, 500))

router.get('/', async (req, res, next) => {
  const user = req.query['user']

  if (!user || user === '') {
    res.status(404).end()
    return
  }

  res.json({
      user: user,
      posts: await getActivities(user, 'posts'),
      comments: await getActivities(user, 'comments')
  })
})

module.exports = router
