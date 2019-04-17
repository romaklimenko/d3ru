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
  const maxPageCount = 50
  let page = 1
  let pageCount = null
  let originalPageCount = null

  const url = new URL(`https://d3.ru/api/users/${user}/${type}/`)
  const activities = []

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
    pageCount = Math.min(pageCount || response.page_count, maxPageCount)
    originalPageCount = originalPageCount || response.page_count
    if (response[type].length > 0 && response[type][0].user) {
      // TODO: плохо пахнет – нам нужно имя пользователя только чтобы проверить регистр
      user = response[type][0].user.login
    }
    else {
      console.log(response[type][0])
    }
    activities.push(...response[type].map(activityMapper))
    page++
  }

  activities.sort((a, b) => a.created < b.created ? 1 : -1)

  return {
    activities: activities.filter(a => a.created !== undefined),
    type: type,
    user: user,
    pageCount: pageCount,
    originalPageCount: originalPageCount
  }
}

router.use(cache(60 * 60 * 24 * 7, 500))

router.get('/', async (req, res) => {
  try {
    let user = req.query['user']

    if (!user || user === '') {
      res.status(404).end()
    }
    else {
      const posts = await getActivities(user, 'posts')
      const comments = await getActivities(user, 'comments')

      if (posts.pageCount < posts.originalPageCount || comments.pageCount < comments.originalPageCount) {
        if (posts.activities.length > comments.activities.length) {
          comments.activities = comments.activities.filter(c => c.created >= posts.activities[posts.activities.length - 1].created)
        }
        else {
          posts.activities = posts.activities.filter(p => p.created >= comments.activities[comments.activities.length - 1].created)
        }
      }

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
