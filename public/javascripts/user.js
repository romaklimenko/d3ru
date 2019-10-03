$(() => {
  const user = getParam('user')
  const from = getParam('from')
  const to = getParam('to')
  const inputRow = $('#input')
  const statusRow = $('#status')
  const reportRow = $('#report')
  const userNameInput = $('#user-name-input')
  const ok = $('#ok')

  const groomActivities = activities => {
    const groomActivity = activity => {
      activity.datetime = new Date(activity.created * 1000)
      const date = new Date(activity.datetime)
      date.setHours(0, 0, 0)
      activity.date = date
      const time = new Date(1900, 0)
      time.setHours(activity.datetime.getHours(), activity.datetime.getMinutes())
      activity.time = time
    }

    activities.posts.forEach(groomActivity)
    activities.comments.forEach(groomActivity)
  }

  const onNoUserSpecified = async () => {
    inputRow.show()
    userNameInput.focus()
  }

  const onUserSpecified = async () => {
    document.title = `${user} - пользователь dirty`
    statusRow.show()

    $('.user-name').text(user)

    reportRow.show()
    const width = Math.min($('svg#activities-chart').parent().width(), 1000)
    reportRow.hide()

    $('svg.chart').attr('width', width)
    $('svg#weekdays-chart').attr('width', width)
    $('svg.chart').attr('height', Math.min(500, width / 4 * 3))

    try {
      const activities = await d3.json(`/api/users/?user=${user.toLowerCase()}`)

      if (from) {
        activities.posts = activities.posts.filter(d => d.created >= from)
        activities.comments = activities.comments.filter(d => d.created >= from)
      }
      if (to) {
        activities.posts = activities.posts.filter(d => d.created <= to)
        activities.comments = activities.comments.filter(d => d.created <= to)
      }

      $('.user-name').html(`<a href="https://d3.ru/user/${activities.user}/" target="_blank">${activities.user}</a>`)
      document.title = `${activities.user} - пользователь dirty`

      groomActivities(activities)

      renderActivitiesChart(activities, document.getElementById('activities-chart'))
      renderWeekdaysChart(activities, document.getElementById('weekdays-chart'), document.getElementById('weekdays-report'))
      renderSleepsChart(activities, document.getElementById('sleeps-chart'))
      renderRatingChart(activities, document.getElementById('rating-chart'))
      renderTopActivities(activities)
      renderRating(activities)
      renderKarma(user, document.getElementById('karma-chart'))

      statusRow.hide()
      reportRow.show()
    }
    catch(error) {
      statusRow.text(error)
      throw error
    }
  }

  if (user === null) {
    onNoUserSpecified()
  }
  else {
    onUserSpecified()
  }

  const redirectToUser = () => {
    if (userNameInput.val().length > 0) {
      location.search = '?user=' + userNameInput.val().trim()
    }
  }

  userNameInput.keypress((e) => {
    if(e.which === 13) {
      redirectToUser()
    }
  })

  ok.click(redirectToUser)
})

function getAllActivities (activities) {
  const data = activities.posts.slice()
  data.push(...activities.comments)
  return data
}

function renderActivitiesChart(activities, element) {
  const height = element.getAttribute('height')
  const width = element.getAttribute('width')
  const margin = {
    top: 20,
    right: 30,
    bottom: 30,
    left: 60
  }

  const data = getAllActivities(activities)

  const svg = d3.select(element)

  const to = getParam('to')

  const x = d3.scaleTime()
    .domain(d3.extent([d3.min(data, d => d.datetime), to ? new Date(to * 1000) : new Date()]))
    .range([margin.left, width - margin.right])

  const fromTime = new Date(1900, 0)
  fromTime.setHours(0, 0, 0)
  const toTime = new Date(1900, 0)
  fromTime.setHours(23, 59, 59)
  const y = d3.scaleTime()
    .domain(d3.extent([toTime, fromTime]).reverse())
    .range([height - margin.bottom, margin.top])

  const xAxis = g => g
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))

  const yAxis = g => g
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(24, '%H:00'))

  svg.append('g').call(xAxis)
  svg.append('g').call(yAxis)

  const positive = '#00C853'
  const neutral = '#757575'
  const negative = '#FF5722'

  svg.append('g')
    .selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.datetime))
    .attr('cy', d => y(d.time))
    .attr('fill', d => d.rating > 0 ? positive : (d.rating < 0 ? negative : neutral))
    .attr('r', d => d.rating == 0 ? 1 : 1.5)
}

function renderWeekdaysChart(activities, chartElement, reportElement) {
  const height = chartElement.getAttribute('height')
  const width = chartElement.getAttribute('width')
  const margin = {
    top: 20,
    right: 30,
    bottom: 30,
    left: 60
  }

  const dict = {}

  const allActivities = getAllActivities(activities)

  if (allActivities.length === 0) {
    return
  }

  allActivities.forEach(a => {
    const key = a.date.toISOString()
    if (dict[key]) {
      dict[key].count++,
      dict[key].from = Math.min(dict[key].from, a.created)
      dict[key].to = Math.max(dict[key].to, a.created)
    }
    else {
      dict[key] = {
        date: a.date,
        count: 1,
        from: a.created,
        to: a.created
      }
    }
  })

  const data = Object.keys(dict).map(key => dict[key])

  const svg = d3.select(chartElement)

  const to = getParam('to')

  const x = d3.scaleTime()
    .domain(d3.extent([d3.min(data, d => d.date), to ? new Date(to * 1000) : new Date()]))
    .range([margin.left, width - margin.right])

  const y = d3.scaleLinear()
    .domain(d3.extent([0, d3.max(data, d => d.count)]))
    .range([height - margin.bottom, margin.top])

  const xAxis = g => g
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))

  const yAxis = g => g
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))

  const yAxisRight = g => g
    .attr('transform', `translate(${width - margin.right},0)`)
    .call(d3.axisRight(y))

  svg.append('g').call(xAxis)
  svg.append('g').call(yAxis)
  svg.append('g').call(yAxisRight)

  svg.append('g')
    .selectAll('line')
    .data(data)
    .enter()
    .append('line')
    .attr('x1', d => x(d.date))
    .attr('y1', d => y(d.count))
    .attr('x2', d => x(d.date))
    .attr('y2', d => y(0))
    .attr('stroke', d => (d.date.getDay() === 0 || d.date.getDay() == 6) ? 'red' : 'black')
    .attr('stroke-width', 1)
    .attr('opacity', .5)

  const top = data.map(d => d).sort((a, b) => a.count > b.count ? -1 : 1).slice(0, 10)
  const list = $(reportElement)
  top.forEach(d => {
    list.append(`<li>
        <strong>${d.date.toLocaleDateString()}</strong> было написано <strong>${d.count}</strong>
        <a href="https://d3.ru/search/?author=${activities.user}&date_start=${d.from - 1000}&date_end=${d.to + 1000}&sort=date" target="_blank">записей</a>
      </li>`)
  })

  // trendline
  const min_created_date = new Date(d3.min(allActivities, d => d.created) * 1000)
  min_created_date.setHours(0, 0, 0, 0)
  const min_created = Math.floor(min_created_date.getTime() / 1000)
  const now_created = Math.floor((to ? new Date(to * 1000) : new Date()).getTime() / 1000)
  let current_created = min_created

  while (current_created <= now_created) {
    const date = new Date(current_created * 1000)
    date.setHours(0, 0, 0, 0)
    const key = date.toISOString()
    if (!dict[key]) {
      dict[key] = {
        date: date,
        count: 0
      }
    }
    current_created += 86400
  }

  const filled_data = Object.keys(dict)
    .map(key => dict[key])
    .sort((a, b) => a.date > b.date ? 1 : -1)

  const window_size = 30

  // это место очевидно можно ускорить
  filled_data.forEach((day, i) => {
    const from = Math.max(0, i - window_size + 1)
    const to = from + Math.min(i + 1, window_size)
    const window = filled_data.slice(from, to)
    day.mean = d3.sum(window, d => d.count) / window_size
  })

  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.mean))
    .curve(d3.curveMonotoneX)

  svg
    .append('g')
    .append('path')
    .datum(filled_data)
    .attr('fill', 'none')
    .attr('stroke-width', 1)
    .attr('stroke', 'red')
    .attr('d', line)

  $('#weekdays-chart').after(`<p>Сейчас среднее количество записей пользователя за последние ${window_size} дней равно <strong>${filled_data[filled_data.length - 1].mean}</strong> записей в день.</p>`)

  console.log('weekdays', filled_data)
}

function renderSleepsChart(activities, element) {
  const data = getAllActivities(activities)
  data.sort((a, b) => a.created > b.created ? 1 : -1)
  const height = element.getAttribute('height')
  const width = element.getAttribute('width')
  const margin = {
    top: 20,
    right: 30,
    bottom: 30,
    left: 60
  }

  const svg = d3.select(element)

  const _24h = 1000 * 60 * 60 * 24
  const sleeps = []

  const by_date = {}

  const push = (key, record) => {
    if (by_date[key]) {
      by_date[key].push(record)
    }
    else {
      by_date[key] = [record]
    }
  }

  data.forEach((d, i) => {
    if (i === 0) return

    const key_start = new Date(data[i - 1].date).toISOString()
    const key_end = new Date(d.date).toISOString()
    const start = new Date(data[i - 1].created * 1000)
    const end = new Date(d.created * 1000)
    const distance = i < data.length - 1 ?
      new Date(d.created * 1000) - new Date(data[i - 1].created * 1000) : _24h * 2

    const record = {
      start: start,
      end: end,
      distance: distance,
      hours: distance / 1000 / 60 / 60
    }

    push(key_start, record)
    push(key_end, record)
  })

  const keys = Object.keys(by_date)

  const find_max_record = (records) => {
    let record = null
    for (let i = 0; i < records.length; i++) {
      if (!record || record.distance < records[i].distance) {
        record = records[i]
      }
    }
    return record
  }

  const max_spans = []

  for (let i = 0; i < keys.length; i++) {
    let record = find_max_record(by_date[keys[i]])
    if (record.distance < _24h) {
      max_spans.push(record)
    }
  }

  max_spans.forEach((d, i) => {
    if (i === 0 || d.start - max_spans[i - 1].start !== 0) {
      if (d.start.toDateString() !== d.end.toDateString()) {
        const midnight = new Date(new Date(d.end).setHours(0, 0, 0, 0))
        sleeps.push({
          start: d.start,
          end: new Date(new Date(d.start).setHours(23, 59, 59, 0)),
          distance: d.distance,
          hours: d.hours
        })
        sleeps.push({
          start: new Date(new Date(d.end).setHours(0, 0, 0, 0)),
          end: d.end,
          distance: d.distance,
          hours: d.hours
        })
      }
      else {
        sleeps.push(d)
      }
    }
  })

  const to = getParam('to')

  const x = d3.scaleTime()
    .domain(d3.extent([d3.min(data, d => d.datetime), to ? new Date(to * 1000) : new Date()]))
    .range([margin.left, width - margin.right])

  const y = d3.scaleTime()
    .domain(d3.extent(data, d => d.time).reverse())
    .range([height - margin.bottom, margin.top])

  const xAxis = g => g
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))

  const yAxis = g => g
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(24, '%H:00'))

  svg.append('g').call(xAxis)
  svg.append('g').call(yAxis)

  const positive = '#B0BEC5'
  const neutral = '#FF9800'
  const negative = '#FF5722'

  svg.append('g')
    .selectAll('line')
    .data(sleeps.sort((a, b) => a.hours > b.hours ? -1 : 1))
    .enter()
    .append('line') // <line x1="0" y1="80" x2="100" y2="20" stroke="black" />
    .attr('x1', d => x(d.end))
    .attr('y1', d => {
      const start = new Date(d.start)
      start.setFullYear(1900, 0, 1)
      return y(new Date(start))
    })
    .attr('x2', d => x(d.end))
    .attr('y2', d => {
      const end = new Date(d.end)
      end.setFullYear(1900, 0, 1)
      return y(new Date(end))
    })
    .attr('stroke', d => d.hours > 8 ? positive : (d.hours < 6 ? negative : neutral))
    .attr('stroke-width', d => d.hours > 8 ? 0.7 : (d.hours < 6 ? 2 : 1.5))
}

function renderRatingChart(activities, element) {
  const data = getAllActivities(activities)
  data.sort((a, b) => a.created > b.created ? 1 : -1)

  data.forEach((d, i) => {
    if (i === 0) {
      d.cumulativeRating = d.rating
    }
    else {
      d.cumulativeRating = data[i - 1].cumulativeRating + d.rating
    }
  })

  const height = element.getAttribute('height')
  const width = element.getAttribute('width')
  const margin = {
    top: 20,
    right: 30,
    bottom: 30,
    left: 60
  }

  const svg = d3.select(element)

  const to = getParam('to')

  const x = d3.scaleTime()
    .domain(d3.extent([d3.min(data, d => d.datetime), to ? new Date(to * 1000) : new Date()]))
    .range([margin.left, width - margin.right])

  const y = d3.scaleLinear()
    .domain(d3.extent([Math.min(0, d3.min(data, d => d.cumulativeRating)), Math.max(d3.max(data, d => d.cumulativeRating))]))
    .range([height - margin.bottom, margin.top])

  const xAxis = g => g
    .attr('transform', `translate(0,${y(0)})`)
    .call(d3.axisBottom(x))

  const yAxis = g => g
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))

  svg.append('g').call(xAxis)
  svg.append('g').call(yAxis)

  const positive = '#00C853'
  const neutral = '#757575'
  const negative = '#FF5722'

  svg.append('g')
    .selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.datetime))
    .attr('cy', d => y(d.cumulativeRating))
    .attr('fill', d => d.rating > 0 ? positive : (d.rating < 0 ? negative : neutral))
    .attr('r', d => d.rating == 0 ? 1 : 1.5)
}

function renderTopActivities(activities) {
  const numberOfActivities = 10

  const topDownwotedPosts = activities.posts
    .filter(a => a.rating < 0)
    .sort((a, b) => a.rating > b.rating ? 1 : -1)
    .slice(0, numberOfActivities)

  const topUpvotedPosts = activities.posts
    .filter(a => a.rating > 0)
    .sort((a, b) => a.rating < b.rating ? 1 : -1)
    .slice(0, numberOfActivities)

  const topDownvotedComments = activities.comments
    .filter(a => a.rating < 0)
    .sort((a, b) => a.rating > b.rating ? 1 : -1)
    .slice(0, numberOfActivities)

  const topUpvotedComments = activities.comments
    .filter(a => a.rating > 0)
    .sort((a, b) => a.rating < b.rating ? 1 : -1)
    .slice(0, numberOfActivities)

  const posts = {}

  topUpvotedPosts.forEach(post => posts[post.id] = {})
  topDownwotedPosts.forEach(post => posts[post.id] = {})
  topUpvotedComments.forEach(comment => posts[comment.post_id] = {})
  topDownvotedComments.forEach(comment => posts[comment.post_id] = {})

  Object.keys(posts).forEach(postId => {
    const url = `https://d3.ru/api/posts/${postId}/`
    const xhr = createCORSRequest('GET', url);

    xhr.onload = (progresEvent) => {
      const json = JSON.parse(progresEvent.target.response)

      if (json === null) {
        posts[postId] = null
      }
      else {
        posts[postId].link = json._links[1].href
        posts[postId].rating = json.rating
        posts[postId].title = json.title
        posts[postId].post_id = json.id,
        posts[postId].created = json.created
      }

      const keys = Object.keys(posts);
      for (let i = 0; i < keys.length; i++) {
        if (posts[keys[i]] === null) {
          continue
        }
        if (posts[keys[i]].link === undefined) {
          return
        }
      }

      const getDomain = (a) => a.domain === '' ? '<strong>d3</strong>' : `<strong>${a.domain}</strong>`
      const getTitle = (a) => a.title === '' ? `#${a.post_id}` : a.title

      const topActivities = $('#top-activities')

      const appendPost = p => {

        const post = posts[p.id]
        if (post === null) {
          return
        }
        topActivities.append(
          `Пост "<a href="${post.link}" target="_blank">${getTitle(post)}</a>" от ${new Date(post.created * 1000).toLocaleDateString()} на ${getDomain(p)} набрал ${post.rating}<br>`)
      }

      const appendComment = c => {
        const post = posts[c.post_id]
        if (post === null) {
          return
        }
        topActivities.append(
          `Комментарий от <strong>${new Date(c.created * 1000).toLocaleDateString()}</strong> в посте "<a href="${post.link}?filter=unread&sorting=rating#${c.id}" target="_blank">${getTitle(post)}</a>" на ${getDomain(c)} набрал <strong>${c.rating}</strong><br>`)
      }

      topActivities.append('<div><strong>Самые заплюсованные посты:</strong></div>')
      topUpvotedPosts.forEach(appendPost)

      topActivities.append('<hr><div><strong>Самые заминусованные посты:</strong></div>')
      topDownwotedPosts.forEach(appendPost)

      topActivities.append('<hr><div><strong>Самые заплюсованные комментарии:</strong></div>')
      topUpvotedComments.forEach(appendComment)

      topActivities.append('<hr><div><strong>Самые заминусованные комментарии:</strong></div>')
      topDownvotedComments.forEach(appendComment)

      topActivities.append('<br>')
    }

    xhr.onerror = (error) => {
      console.log(error)
    }

    xhr.send()
  })

function createCORSRequest(method, url) {
  var xhr = new XMLHttpRequest();
  if ('withCredentials' in xhr) {
    xhr.open(method, url, true);
  } else if (typeof XDomainRequest !== 'undefined') {
    xhr = new XDomainRequest();
    xhr.open(method, url);
  } else {
    // CORS not supported.
    console.log('CORS поломался (а раньше работал)')
    xhr = null;
  }
  return xhr;
}}

function renderRating(activities) {
  const list = $('#rating-report')
  const rating = {}
  getAllActivities(activities).forEach(a => {
    if (rating[a.domain]) {
      rating[a.domain].rating += a.rating
      rating[a.domain].count++
      if (a.post_id) {
        rating[a.domain].preferencesRating += 1
      }
      else {
        rating[a.domain].preferencesRating += 10
      }
    }
    else {
      rating[a.domain] = {
        rating: a.rating,
        count: 1,
        preferencesRating: a.post_id ? 1 : 10
      }
    }
  })

  Object.keys(rating)
    .map(key => {
      return {
        domain: key,
        rating: rating[key].rating,
        count: rating[key].count,
        preferencesRating: rating[key].preferencesRating
      }
    })
    .sort((a, b) => {
      return a.rating > b.rating ? -1 : 1
    })
    .forEach(d => {
      const domainUrl = d.domain === '' ? 'https://d3.ru' : `https://${d.domain}.d3.ru/`
      const domainName = d.domain === '' ? 'd3' : `${d.domain}`
      list.append(
        `<tr>
            <td><a href="${domainUrl}" target="_blank">${domainName}</a></td>
            <td>${d.count}</td>
            <td>${d.rating}</td>
            <td>${Math.floor((d.rating / d.count) * 100) / 100}</td>
            <td>${d.preferencesRating}</td>
        </tr>`)
    })

    $('#rating-table').DataTable({
      searching: false,
      paging: false,
      info: false,
      order: [[2, 'desc']]
    })
}

async function renderKarma(user, element) {
  let data = []
  let page = 1
  let page_count = 1

  const uid = localStorage.getItem('uid')
  const sid = localStorage.getItem('sid')

  if (!uid || !sid) {
    return
  }

  const params = {
    method: 'GET',
    headers: {
      'X-Futuware-UID': uid,
      'X-Futuware-SID': sid
    }
  }

  while (page <= page_count) {
    const response = await fetch(`https://d3.ru/api/users/${user}/votes/?page=${page}&per_page=210`, params)
    const result = await response.json()

    if (result === null) {
      return
    }

    if (result.page_count) {
      page_count = result.page_count
    }

    if (result.upvotes) {
      data.push(...result.upvotes)
    }

    if (result.downvotes) {
      data.push(...result.downvotes)
    }

    page++
  }

  data.sort((a, b) => a.changed > b.changed ? 1 : -1)

  data.forEach((v, i) => {
    if (i === 0) {
      v.karma = v.vote
    }
    else {
      v.karma = data[i - 1].karma + v.vote
    }
    v.datetime = new Date(v.changed * 1000)
  })

  const from = getParam('from')
  const to = getParam('to')

  if (from) {
    data = data.filter(d => d.changed >= from)
  }
  if (to) {
    data = data.filter(d => d.changed <= to)
  }

  console.log('karma', data)

  const height = element.getAttribute('height')
  const width = element.getAttribute('width')
  const margin = {
    top: 20,
    right: 30,
    bottom: 30,
    left: 60
  }

  const svg = d3.select(element)

  const x = d3.scaleTime()
    .domain(d3.extent([d3.min(data, d => d.datetime), to ? new Date(to * 1000) : new Date()]))
    .range([margin.left, width - margin.right])

  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.karma))
    .range([height - margin.bottom, margin.top])

  const xAxis = g => g
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))

  const yAxis = g => g
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))

  svg.append('g').call(xAxis)
  svg.append('g').call(yAxis)

  svg.append('line')
    .attr('x1', x(d3.min(data, d => d.datetime)))
    .attr('x2', x(d3.max(data, d => d.datetime)))
    .attr('y1', y(0))
    .attr('y2', y(0))
    .attr('stroke', '#000')
    .attr('stroke-width', .75)

  svg.append('g')
    .selectAll('circle')
    .data(data.filter(d => d.user.login === 'dirty'))
    .enter()
    .append('circle')
    .attr('cx', d => x(d.datetime))
    .attr('cy', d => y(d.karma))
    .attr('fill', '#FFAB00')
    .attr('r', 9)

  svg.append('g')
    .selectAll('image')
    .data(data.filter(d => d.user.login === 'dirty'))
    .enter()
    .append('image')
    .attr('href', '/images/logo_main_retina.png')
    .attr('x', d => x(d.datetime) - 24)
    .attr('y', d => y(d.karma) - 24)
    .attr('heigth', '48px')
    .attr('width', '48px')

  const positive = '#00C853'
  const negative = '#FF5722'

  svg.append('g')
    .selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.datetime))
    .attr('cy', d => y(d.karma))
    .attr('fill', d => d.vote > 0 ? positive : negative)
    .attr('r', d => Math.abs(d.vote) === 1 ? 1 : 1.5)

  const by_date = {}

  for (let i = data.length; i--;) {
    const vote = data[i]
    const key = vote.datetime.toLocaleDateString()
    if (by_date[key] === undefined) {
      by_date[key] = {
        votes: [vote],
        up: Math.max(0, vote.vote),
        down: Math.min(vote.vote, 0)
      }
    }
    else {
      by_date[key].votes.push(vote),
      by_date[key].up += Math.max(0, vote.vote)
      by_date[key].down += Math.min(vote.vote, 0)
    }
  }

  console.log('by_date', by_date)

  const keys = Object.keys(by_date)

  const log = $('#karma-log')

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const date = by_date[key]
    const delta = date.up + date.down
    let delta_color = '#000'
    if (delta > 0) delta_color = positive
    if (delta < 0) delta_color = negative
    log.append(`<a href="https://d3.ru/search/?author=${user}&date_start=${date.votes[0].changed - 86400 * 3}&date_end=${date.votes[0].changed + 86400}&sort=date" target="_blank">${key}</a> <strong>(<span style="color:${date.up === 0 ? '#000' : positive}">+${date.up}</span>&#09;<span style="color:${date.down === 0 ? '#000' : negative}">-${Math.abs(date.down)}</span>&#09;&rarr; <span style="color:${delta_color}">${(delta) >= 0 ? '+' : ''}${delta}</span>):</strong>`)

    for (let j = 0; j < date.votes.length; j++) {
      log.append(`<div>&nbsp;<span style="color:${date.votes[j].vote > 0 ? positive : negative}">${date.votes[j].vote > 0 ? '+' : ''}${date.votes[j].vote}</span>&#09;${date.votes[j].datetime.toLocaleTimeString()}&#09;<a href="https://d3.ru/user/${date.votes[j].user.login}/" target="_blank">${date.votes[j].user.login}</a></div>`)
    }
  }
}