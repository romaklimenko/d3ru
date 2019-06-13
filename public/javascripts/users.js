$(() => {
  const users = toArray(getParam('users'))
  const introRow = $('#intro')
  const inputRow = $('#input')
  const statusRow = $('#status')
  const reportRow = $('#report')
  const userNamesInput = $('#user-names-input')
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

  const onNoUsersSpecified = async () => {
    introRow.show()
    inputRow.show()
    userNamesInput.focus()
  }

  const onUsersSpecified = async () => {
    document.title = `${users.join(', ')} - пользователи dirty`
    statusRow.show()

    $('.user-names').text(users.join(', '))

    reportRow.show()
    const width = Math.min($('svg.chart').parent().width(), 1000)
    $('svg.chart').attr('height', Math.min(500, width / 4 * 3))
    reportRow.hide()

    $('svg.chart').attr('width', width)

    try {
      const activities = {}
      for (let i = 0; i < users.length; i++) {
        const json = await d3.json(`/api/users/?user=${users[i].toLowerCase()}`)
        users[i] = json.user
        groomActivities(json)
        activities[users[i]] = json
      }

      let legend = ''
      users.forEach((u, i) => {
        legend += `<a href="https://d3.ru/user/${u}/" style="color:${google10c(i)}" target="_blank">${u}</a>`
        if (i === users.length - 2) {
          legend += ' и '
        }
        else if (i < users.length - 1) {
          legend += ', '
        }
      })

      $('.user-names').html(legend)
      document.title = `${users.join(', ')} - пользователи dirty`

      render(activities, document.getElementById('compare-chart'))

      statusRow.hide()
      reportRow.show()
    }
    catch(error) {
      statusRow.text(error)
      throw error
    }
  }

  if (users.length < 2) {
    onNoUsersSpecified()
  }
  else {
    onUsersSpecified()
  }

  const redirectToUsers = () => {
    const users = toArray(userNamesInput.val())
    if (users.length > 1) {
      location.search = '?users=' + users
    }
  }

  userNamesInput.keypress((e) => {
    if(e.which === 13) {
      redirectToUsers()
    }
  })

  ok.click(redirectToUsers)
})

function toArray(s) {
  if (s === null || !s.trim()) {
    return []
  }

  return s.split(',')
    .map(i => i.trim())
    .filter(i => i !== '')
}

function getAllActivities (activities) {
  const data = activities.posts.slice()
  data.push(...activities.comments)
  return data
}

function render(activities, element) {
  const height = element.getAttribute('height')
  const width = element.getAttribute('width')
  const margin = {
    top: 20,
    right: 30,
    bottom: 30,
    left: 60
  }

  const data = []

  const users = Object.keys(activities)
  for (let i = 0; i < users.length; i++) {
    data.push({
      user: users[i],
      activities: getAllActivities(activities[users[i]]),
      color: google10c(i)
    })
  }

  const svg = d3.select(element)

    let all_activities = []
    data.forEach(d => all_activities = all_activities.concat(d.activities))

    const x = d3.scaleTime()
      .domain(d3.extent([d3.min(all_activities, d => d.date), new Date()]))
      .range([margin.left, width - margin.right])

    const y = d3.scaleTime()
      .domain(d3.extent(all_activities, d => d.time).reverse())
      .range([height - margin.bottom, margin.top])

    const xAxis = g => g
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))

    const yAxis = g => g
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(24, '%H:00'))

    svg.append('g').call(xAxis)
    svg.append('g').call(yAxis)

    const opacity = .75
    const radius = 1.5

    data.forEach(user => {
      svg.append('g')
        .selectAll('circle')
        .data(user.activities)
        .enter()
        .append('circle')
        .attr('cx', d => x(d.date))
        .attr('cy', d => y(d.time))
        .attr('r', radius)
        .attr('opacity', opacity)
        .attr('fill', user.color)
    })
}