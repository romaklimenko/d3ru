$(() => {
  let uid = localStorage.getItem('uid')
  if (uid) {
    $('#input-uid').val(uid)
  }

  let sid = localStorage.getItem('sid')
  if (sid) {
    $('#input-sid').val(sid)
  }

  let username = localStorage.getItem('username')
  if (username) {
    $('#input-username').val(username)
  }

  $('#ok').click(() => {
    localStorage.setItem('uid', $('#input-uid').val())
    localStorage.setItem('sid', $('#input-sid').val())
    localStorage.setItem('username', $('#input-username').val())
  })
})