$(() => {
  const user = getParam('user')
  const introRow = $('#intro')
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
    introRow.show()
    inputRow.show()
    userNameInput.focus()
  }

  const onUserSpecified = async () => {
    statusRow.show()

    $('.user-name').text(user)

    reportRow.show()
    const width = Math.min($('svg#activities-chart').parent().width(), 800)
    reportRow.hide()

    $('svg.chart').attr('width', width)

    try {
      const activities = await d3.json(`/api/users/?user=${user.toLowerCase()}`)

      $('.user-name').text(activities.user)

      groomActivities(activities)

      renderActivitiesChart(activities, document.getElementById('activities-chart'))
      renderSleepsChart(activities, document.getElementById('sleeps-chart'))
      renderRatingChart(activities, document.getElementById('rating-chart'))

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
      location.search = '?user=' + userNameInput.val()
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
    left: 40
  }

  const data = getAllActivities(activities)

  const svg = d3.select(element)

  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
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

function renderSleepsChart(activities, element) {
  const data = getAllActivities(activities)
  data.sort((a, b) => a.created > b.created ? 1 : -1)
  const height = element.getAttribute('height')
  const width = element.getAttribute('width')
  const margin = {
    top: 20,
    right: 30,
    bottom: 30,
    left: 40
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

  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
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
    left: 40
  }

  const svg = d3.select(element)

  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.datetime))
    .range([margin.left, width - margin.right])

  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.cumulativeRating))
    .range([height - margin.bottom, margin.top])

  const xAxis = g => g
    .attr('transform', `translate(0,${height - margin.bottom})`)
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