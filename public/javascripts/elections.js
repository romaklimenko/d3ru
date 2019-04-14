$(() => {
  const domain = getParam('domain')
  const introRow = $('#intro')
  const inputRow = $('#input')
  const reportRow = $('#report')

  const onNoDomainSpecified = async () => {
    introRow.show()
    inputRow.show()
  }

  const onDomainSpecified = async () => {
    reportRow.show()
    $('#domain-name').text(domain)

    const electionsChart = $('svg#elections-chart')
    const width = electionsChart.parent().width()
    electionsChart.attr('width', width)

    let votes = []
    let offset = 0

    let need_a_break = false

    while (!need_a_break) {
      const votesResponse = await d3.json(`/ajax/democracy/last-votes/?domain=${domain}&offset=${offset}`)

      offset = votesResponse.offset

      if (votesResponse.votes.length === 0) {
        // TODO: написать что-нибудь
        need_a_break = true
      }

      votes.push(...votesResponse.votes.filter(v => v.domain.url === `${domain}.d3.ru`).map(v => {
        return {
          created_at: v.created_at,
          from: v.voter.login,
          to: v.user.login
        }
      }))

      if (votes.length === 0) {
        return
      }

      votes.sort((a, b) => a.created_at < b.created_at ? 1 : -1)

      for (let i = 0; i < votes.length; i++) {
        if ((i + 1) < votes.length && votes[i].created_at - votes[i + 1].created_at > 86400) {
          votes = votes.slice(0, i + 1)
          need_a_break = true
        }
      }
    }

    votes.sort((a, b) => {
      if (a.to > b.to) {
        return 1
      }
      if (a.to < b.to) {
        return -1
      }
      // от меньшего к большему
      return a.created_at > b.created_at ? 1 : -1
    })

    for (let i = 0; i < votes.length; i++) {
      if (i === 0 || votes[i].to !== votes[i - 1].to) {
        votes[i].vote = 1
      }
      else {
        votes[i].vote = votes[i - 1].vote + 1
      }
    }

    votes.sort((a, b) => a.created_at > b.created_at ? 1 : -1)

    renderChart(votes, document.getElementById('elections-chart'))
    renderLegend(votes)
  }

  if (domain === null) {
    onNoDomainSpecified()
  }
  else {
    onDomainSpecified()
  }

  const domainNameInput = $('#domain-name-input')
  const ok = $('#ok')

  const redirectToDomain = () => {
    if (domainNameInput.val().length > 0) {
      location.search = '?domain=' + domainNameInput.val()
    }
  }

  domainNameInput.keypress((e) => {
    if(e.which === 13) {
      redirectToDomain()
    }
  })

  ok.click(() => redirectToDomain)
})

function renderChart(votes, element) {
  console.log('renders a chart', votes)

  const height = element.getAttribute('height')
  const width = element.getAttribute('width')
  const margin = {
    top: 20,
    right: 30,
    bottom: 30,
    left: 40
  }

  const data = {}

  votes.forEach(d => {
    const vote = {
      created_at: new Date(d.created_at * 1000),
      vote: d.vote
    }
    if (data[d.to] === undefined) {
      data[d.to] = [vote]
    }
    else {
      data[d.to].push(vote)
    }
  })

  const svg = d3.select(`#${element.id}`)

  const x = d3.scaleTime()
    .domain(d3.extent(votes, d => new Date(d.created_at * 1000)))
    .range([margin.left, width - margin.right])

  const y = d3.scaleLinear()
    .domain([0, d3.max(votes, d => d.vote)])
    .range([height - margin.bottom, margin.top])

  const xAxis = g => g
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))

  const yAxis = g => g
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))

  svg.append('g').call(xAxis)
  svg.append('g').call(yAxis)

  const g = svg.append('g')

  const line = d3.line()
    .x(d => x(d.created_at))
    .y(d => y(d.vote))
    .curve(d3.curveMonotoneX)

  Object.keys(data).forEach((d, i) => {
    g.append('path')
      .datum(data[d])
      .attr('fill', 'none')
      .attr('stroke-width', 2)
      .attr('stroke', google10c(i))
      .attr('d', line)
  })
}

function renderLegend(votes) {
  const p = document.createElement('p')
  const set = new Set()

  votes.forEach(vote => set.add(vote.to))
  let i = 0
  set.forEach(vote => {
    const span = document.createElement('span')
    span.innerHTML = `<svg style="position:relative;top:1px;" width=14 height=14 viewBox="-10 -10 20 20"><circle r=9 fill="${google10c(i)}"></svg> - <a href="https://d3.ru/user/${vote}" target="_blank">${vote}</a> `
    p.appendChild(span)
    i++
  })
  const legend = document.getElementById('legend')
  legend.appendChild(p)
}