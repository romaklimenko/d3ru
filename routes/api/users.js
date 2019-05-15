const express = require('express')
const router = express.Router()

const fetch = require('node-fetch')

const cache = require('../../middlewares/cache')

const activityMapper = a => {
  const activity = {
    domain: a.domain ? a.domain.prefix : '',
    rating: a.rating ? a.rating : 0,
    created: a.created,
    id: a.id
  }
  if (a.post !== undefined) {
    activity.post_id = a.post.id
  }
  return activity
}

const getCachedActivities = async (user) => {
  if (process.env.DIRTY_CACHE_URL) {
    const cache_url = new URL(process.env.DIRTY_CACHE_URL.replace('%username%', user.toLowerCase()))
    const cached_response = await fetch(cache_url)
    if (cached_response.status == 200) {
      const cached_response_json = await cached_response.json()
      return cached_response_json
    }
    return null
  }
  else {
    return {
      user: user,
      posts: [],
      comments: [],
      limit: Math.floor(new Date().getTime() / 1000.0) - 86400 * 30
    }
  }
}

const getActivities = async (user, type, cachedActivities) => {
  const activities = []
  let limit = -1

  if (cachedActivities !== null) {
    activities.push(...cachedActivities[type])
    limit = cachedActivities.limit
  }

  let page = 1
  let pageCount = null

  const url = new URL(`https://d3.ru/api/users/${user}/${type}/`)

  while (pageCount === null || page <= pageCount) {
    url.searchParams.set('page', page)
    const response = await (await fetch(url)).json()
    if (response === null) { // TODO: это плохо пахнет, надо возвращать 404
      return {
        activities: [],
        type: type,
        user: user,
        pageCount: 0,
        originalPageCount: 0
      }
    }
    pageCount = pageCount || response.page_count
    if (response[type].length > 0 && response[type][0].user) {
      // TODO: плохо пахнет – нам нужно имя пользователя только чтобы проверить регистр
      user = response[type][0].user.login
    }

    const activities_to_push = response[type].map(activityMapper)
      .filter(a => a.created !== undefined)
      .filter(a => limit < 0 || a.created > limit)

    if (activities_to_push.length === 0) {
      page = pageCount + 1
    }
    else {
      activities.push(...activities_to_push)
      page++
    }
  }

  activities.sort((a, b) => a.created < b.created ? 1 : -1)

  return {
    activities: activities,
    type: type,
    user: user,
    pageCount: pageCount
  }
}

router.use(cache(process.env.CACHE_DURATION_IN_SEC || 60 * 60 * 24 * 1, 128))

router.get('/users', async (req, res) => {
  try {
    let user = req.query['user']

    if (!user || user === '') {
      res.status(404).end()
    }
    else {
      const cachedActivities = await getCachedActivities(user)
      const posts = await getActivities(user, 'posts', cachedActivities)
      const comments = await getActivities(user, 'comments', cachedActivities)

      if (posts.activities.length > 0) {
        user = posts.user
      }
      else if (comments.activities.length > 0) {
        user = comments.user
      }

      res.json({
          user: user,
          posts: posts.activities,
          comments: comments.activities
      })
    }
  } catch (e) {
    console.error(e)
    res.status(500).json({
      error: 'здесь должно быть осмысленное сообщение об ошибке, но его нет'
    })
  }
})

module.exports = router
