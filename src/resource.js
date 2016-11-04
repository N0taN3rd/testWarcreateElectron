const rp = require('request-promise')
const Promise = require('bluebird')
const _ = require('lodash')
const zlib = require('zlib')
const S = require('string')
const { cloneWC } = require('./util')
const uuid = require('./node-uuid')
const {
  warcRequestHeader,
  warcResponseHeader,
  recordSeparator
} = require('./warcFields')

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const events = {
  'beforeSend': 1,
  'receiveHead': 2,
  'beforeRedirect': 3,
  'complete': 4,
  1: 'sendHead',
  2: 'receiveHead',
  3: 'beforeRedirect',
  4: 'complete'
}

const headerStringHelper = (s, pair) => {
  if (Array.isArray(pair[ 1 ])) {
    return pair[ 1 ].reduce((s, val) => s + `${pair[ 0 ]}: ${val}\r\n`, '')
  }
  return s + `${pair[ 0 ]}: ${pair[ 1 ]}\r\n`
}

const requestHttpString = r => `${r.method} ${r.url} HTTP/1.0\r\n`
const responseHttpString = r => `${r.statusLine}\r\n`

const stringifyHeaders = (r, accessor) => _
  .sortBy(_.toPairs(r[ accessor ]), [ 0 ])
  .reduce((s, hpair) => headerStringHelper(s, hpair), '')

const makeHeaderString = (r, accessor, func) =>
func(r) + stringifyHeaders(r, accessor)

class Resource {
  constructor (url, type, method) {
    this.request = null
    this.response = null
    this.complete = null
    this.redirect = null
    this.matchedNinfo = null
    this.method = method
    this.type = type
    this.url = url
    this.completed = false
    this.didRedirect = false
    this.rdata = null
    this.getHeaders = null
    this.isSeed = false
    this.seedUrlHeaderMap = this.seedUrlHeaderMap.bind(this)
  }

  add (event, dets) {
    let eNum = events[ event ]
    if (eNum === 1) {
      if (!this.getHeaders) {
        this.getHeaders = dets.requestHeaders
      }
      if (this.response) {
        let old = this.request
        let n = cloneWC(dets)
        // n.headerText = makeHeaderString(n, 'requestHeaders', requestHttpString)
        this.request = [ old, n ]
      } else {
        this.request = cloneWC(dets)
        // this.request.headerText = makeHeaderString(this.request, 'requestHeaders', requestHttpString)
      }
    } else if (eNum === 2) {
      if (this.response) {
        let old = this.response
        let n = cloneWC(dets)
        // n.headerText = makeHeaderString(n, 'responseHeaders', responseHttpString)
        this.response = [ old, n ]
      } else {
        this.response = cloneWC(dets)
        // this.response.headerText = makeHeaderString(this.response, 'responseHeaders', responseHttpString)
      }
    } else if (eNum === 3) {
      this.redirect = cloneWC(dets)
      this.didRedirect = true
    } else {
      this.complete = cloneWC(dets)
      // this.complete.headerText = makeHeaderString(this.complete, 'responseHeaders', responseHttpString)
      this.completed = true
    }
  }

  canUseMatchedNinfo () {
    if (this.matchedNinfo) {
      console.log(this.url, 'has matchedNifo')
      let { response } = this.matchedNinfo
      if (response) {
        console.log(this.url, 'has matchedNifo response')
      } else {
        console.log(this.url, 'no has matchedNifo response')
      }
    } else {
      return false
    }
  }

  seedUrlHeaderMap (v, k) {
    let lowerKey = k.toLowerCase()
    if (lowerKey === 'content-length') {
      return `${this.rdata.length}`
    } else if (lowerKey === 'content-encoding') {
      return null
    } else if (lowerKey === 'content-type') {
      if (this.url.indexOf('twitter.com') > -1) {
        return v.replace('text/javascript', 'text/html')
      }
    }
    return v
  }

  addSeedUrlBody (dom) {
    this.isSeed = true
    this.rdata = Buffer.from(dom, 'utf8')
    this.response.statusLine = this.response.statusLine.replace('HTTP/1.1 304 Not Modified', 'HTTP/1.1 200 OK')
    this.response.responseHeaders = _.omitBy(_.mapValues(this.response.responseHeaders, this.seedUrlHeaderMap), _.isNull)
    if (this.completed) {
      this.complete.responseHeaders = _.omitBy(_.mapValues(this.complete.responseHeaders, this.seedUrlHeaderMap), _.isNull)
    }
  }

  ungzip (data, resolve, reject) {
    console.log('un gzipping')
    zlib.gunzip(data.body, (err, unzipped) => {
      if (err) {
        console.error(err)
        reject(err)
      } else {
        this.rdata = unzipped.toString()
        console.log(this.rdata)
        resolve()
      }
    })
  }

  inflate (data, resolve, reject) {
    console.log('inflating')
    zlib.inflate(data.body, (err, unzipped) => {
      if (err) {
        console.error(err)
        reject(err)
      } else {
        this.rdata = unzipped.toString()
        console.log(this.rdata)
        resolve()
      }
    })
  }

  writeToWarcFile (warcStream, opts) {
    let { seedUrl, concurrentTo, now } = opts
    if (this.method === 'GET') {
      // let res = this.completed ? this.completed : this.response
      // if (res) {
      //   let reqHeaderString = makeHeaderString(this.request, 'requestHeaders', requestHttpString)
      //   let resHeaderString = makeHeaderString(res, 'responseHeaders', responseHttpString)
      // } else {
      //   let reqHeaderString = makeHeaderString(this.request, 'requestHeaders', requestHttpString)
      // }
      //
      // let swapper = S(warcRequestHeader)
      // let reqWHeader = swapper.template({
      //   targetURI: this.url, concurrentTo,
      //   now, rid: uuid.v1(), len: reqHeaderString.length
      // }).s
      //
      // let respWHeader = swapper.setValue(warcResponseHeader).template({
      //   targetURI: this.url,
      //   now, rid: uuid.v1(), len: resHeaderString.length
      // }).s
    } else {
      // write something
    }
  }

  _response () {
    if (this.redirect) {
      return this.redirect
    } else if (this.complete) {
      return this.complete
    } else {
      return this.response
    }
  }
  /*
   makeWarcResponseHeaderWith(rh, now, warcConcurrentTo,
   responseHeaders[rh] + CRLF, hexValueInt8Ary.length + (CRLF + CRLF).length) + CRLF
   */
  writeToWarcFile2 (warcStream, body, opts) {
    let { seedUrl, concurrentTo, now } = opts
    if (this.method === 'GET') {
      let res = this._response()
      let reqHeaderString
      let resHeaderString
      if (res) {
        reqHeaderString = makeHeaderString(this.request, 'requestHeaders', requestHttpString)
        resHeaderString = makeHeaderString(res, 'responseHeaders', responseHttpString)
      } else {
        reqHeaderString = makeHeaderString(this.request, 'requestHeaders', requestHttpString)
      }
      let swapper = S(warcRequestHeader)
      let reqHeadContentBuffer = Buffer.from('\r\n' + reqHeaderString, 'utf8')
      let reqWHeader = swapper.template({
        targetURI: this.url, concurrentTo,
        now, rid: uuid.v1(), len: reqHeadContentBuffer.length
      }).s
      warcStream.write(reqWHeader, 'utf8')
      warcStream.write(reqHeadContentBuffer, 'utf8')
      warcStream.write(recordSeparator, 'utf8')

      if (res) {
        let resHeaderContentBuffer = Buffer.from(resHeaderString)
        let respWHeader = swapper.setValue(warcResponseHeader).template({
          targetURI: this.url,
          now, rid: uuid.v1(), len: resHeaderContentBuffer.length + body.length
        }).s
      }
    } else {
      //something not get
    }
  }

  dlWrite (warcStream, opts) {
    return new Promise((resolve, reject) => {
      if (this.method !== 'POST') {
        console.log('downloading')
        rp({
          headers: this.getHeaders,
          method: 'GET',
          encoding: null, //always get buffer
          url: this.url,
          strictSSL: false,
          rejectUnauthorized: false,
          resolveWithFullResponse: true
        })
          .then(data => {
            console.log('done downloading')
            this.writeToWarcFile2(warcStream, data.body, opts)
            resolve()
          })
          .catch(error => {
            console.log('downloading error', error)
            reject(error)
          })
      } else {
        this.writeToWarcFile2(warcStream, '', opts)
        resolve()
      }
    })
  }

  dl () {
    return new Promise((resolve, reject) => {
      if (this.method !== 'POST') {
        console.log('downloading')
        rp({
          headers: this.getHeaders,
          method: 'GET',
          encoding: null, //always get buffer
          url: this.url,
          strictSSL: false,
          rejectUnauthorized: false,
          resolveWithFullResponse: true
        })
          .then(data => {
            console.log('done downloading')
            this.rdata = data.body
            resolve()
          })
          .catch(error => {
            console.log('downloading error', error)
            reject(error)
          })
      } else {
        resolve()
      }
    })
  }

  addNetwork (ninfo) {
    this.matchedNinfo = ninfo
  }

}

module.exports = Resource

/*
 if (this.matchedNinfo) {
 // console.log('has matchedNifo')
 let { response } = this.matchedNinfo
 if (response) {
 // console.log('has matchedNifo response')
 let { headersText, requestHeadersText } = response
 if (headersText && requestHeadersText) {
 console.log(this.matchedNinfo)
 console.log(this.request, this.response)
 } else {
 // console.log(headersText, requestHeadersText)
 if (headersText && !requestHeadersText) {
 console.log('has only response headers')
 // console.log(response)
 // console.log(this.request, this.response)
 } else if (!headersText && requestHeadersText) {
 // console.log('has only request headers')
 // console.log(this.matchedNinfo)
 // console.log(this.request, this.response)
 } else {
 console.log('has no matchedNifo header text')
 let { reqHeaderString, resHeaderString } = this.makeHeaderStrings(seedUrl)
 console.log(this.request, this.response)
 }
 }
 } else {
 console.log('no has matchedNifo response', this.matchedNinfo)
 let { reqHeaderString, resHeaderString } = this.makeHeaderStrings(seedUrl)

 }
 } else {
 let { reqHeaderString, resHeaderString } = this.makeHeaderStrings(seedUrl)
 console.log('has no matchedNifo')
 }
 */