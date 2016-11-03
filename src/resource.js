const rp = require('request-promise')
const { cloneWC } = require('./util')
const Promise = require('bluebird')
const zlib = require('zlib')
const _ = require('lodash')

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

const allowedTypes = [ 'script', 'stylesheet' ]

const headerStringHelper = (s, pair) => {
  if (Array.isArray(pair[ 1 ])) {
    return pair[ 1 ].reduce((s, val) => s + `${pair[ 0 ]}: ${val}\r\n`, '')
  }
  return s + `${pair[ 0 ]}: ${pair[ 1 ]}\r\n`
}
const makeRequestHeaderString = (r, accessor) => _.toPairs(r[ accessor ])
  .reduce((s, hpair) => headerStringHelper(s, hpair), '')

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
        n.headerText = makeRequestHeaderString(n, 'requestHeaders')
        this.request = [ old, n ]
      } else {
        this.request = cloneWC(dets)
        this.request.headerText = makeRequestHeaderString(this.request, 'requestHeaders')
      }
    } else if (eNum === 2) {
      if (this.response) {
        let old = this.response
        let n = cloneWC(dets)
        n.headerText = makeRequestHeaderString(n, 'responseHeaders')
        this.response = [ old, n ]
      } else {
        this.response = cloneWC(dets)
        this.response.headerText = makeRequestHeaderString(this.response, 'responseHeaders')
      }
    } else if (eNum === 3) {
      this.redirect = cloneWC(dets)
      this.didRedirect = true
    } else {
      this.complete = cloneWC(dets)
      this.completed = true
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
            this.rdata = data.body.toString()
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

module.exports = {
  Resource,
  events
}