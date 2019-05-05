const memoryCache = require('memory-cache')
const cache = new memoryCache.Cache()

const cacheMiddleware = (duration, maxSize) => {
  return (req, res, next) => {
    if (cache.memsize() > maxSize) {
      console.debug(`The cache size is ${cache.memsize()} => clearing the cache.`)
      cache.clear()
    }

    const key = '__express__' + req.originalUrl || req.url
    const cacheContent = cache.get(key)
    if (cacheContent) {
      res.set('Content-Type', 'application/json');
      res.send(cacheContent);
      return
    } else {
      res.sendResponse = res.send
      res.send = (body) => {
        cache.put(key, body, duration * 1000);
        res.sendResponse(body)
      }
      next()
    }
  }
}

module.exports = cacheMiddleware