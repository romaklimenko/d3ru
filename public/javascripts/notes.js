$(() => {
  let uid = localStorage.getItem('uid')
  let sid = localStorage.getItem('sid')
  let username = localStorage.getItem('username')

  render(uid, sid, username)
})

async function render(uid, sid, username) {
  if (!uid || !sid || !username) {
    $('#notes').append('<a href="/tokens">Доступ</a> не настроен.')
    return
  }

  const data = []
  let page = 1
  let page_count = 1

  const params = {
    method: 'GET',
    headers: {
      'X-Futuware-UID': uid,
      'X-Futuware-SID': sid
    }
  }

  while (page <= page_count) {
    const response = await fetch(
      `https://d3.ru/api/user_notes/?user_login=${username.trim()}&page=${page}`, params)

    if (!response.ok) {
      $('#notes').append(`${response.status}: ${response.statusText}`)
      return
    }

    const result = await response.json()

    if (result === null) {
      return
    }

    if (result.page_count) {
      page_count = result.page_count
    }

    if (result.user_notes) {
      data.push(...result.user_notes)
    }

    page++
  }
  const notes = $('#notes')
  notes.append(`<p>Привет, <a href="https://d3.ru/user/${username}/" target="_blank">${username}</a>! Про вас пишут следующее:`)
  data.forEach(d => {
    if (d.body === '') return
    notes.append(`<li style="color:#919191;">«<i style="color:#000;">${escapeHtml(d.body)}</i>» написал некто ${new Date(d.created * 1000).toLocaleDateString()}</li>`)
  })
}