function getParam(name) {
  const params = new URLSearchParams(window.location.search)
  return params.get(name)
}

function google10c(n) {
  const colors = [
      '#3366cc', '#dc3912', '#ff9900', '#109618', '#990099',
      '#0099c6', '#dd4477', '#66aa00', '#b82e2e', '#316395',
      '#994499', '#22aa99', '#aaaa11', '#6633cc', '#e67300',
      '#8b0707', '#651067', '#329262', '#5574a6', '#3b3eac']
  return colors[n % colors.length]
}

function escapeHtml (string) {
  const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  }
  return String(string).replace(/[&<>"'`=\/]/g, s => entityMap[s])
}