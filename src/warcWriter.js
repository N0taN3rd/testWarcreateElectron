const cheerio = require('cheerio')
const EventEmitter = require('eventemitter3')

class WarcWritter extends EventEmitter {
  constructor () {
    super()
  }

  writeWarc (aUrl, networkInfo, pageInfo) {
    let { theDom } = pageInfo
    console.log(theDom)
    for (let [url,ninfo] of networkInfo) {
      if (aUrl === url) {
        console.log('we found net info for initial request', ninfo)
      } else {
        console.log('we did not have anything for', url)
      }
    }
  }
}

module.exports = WarcWritter