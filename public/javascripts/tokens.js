$(() => {
  let uid = localStorage.getItem('uid')
  if (uid) {
    $('#input-uid').val(uid)
  }

  let sid = localStorage.getItem('sid')
  if (sid) {
    $('#input-sid').val(sid)
  }

  $('#ok').click(() => {
    localStorage.setItem('uid', $('#input-uid').val())
    localStorage.setItem('sid', $('#input-sid').val())
  })
})