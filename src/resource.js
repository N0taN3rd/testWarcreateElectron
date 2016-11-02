const rp = require('request-promise')
const { cloneWC } = require('./util')
const Promise = require('bluebird')
const zlib = require('zlib')
const mimeType = require('mime-types')

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

class Resource {
  constructor (url, type, method) {
    this.request = null
    this.response = null
    this.complete = null
    this.redirect = null
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
        this.request = [ old, cloneWC(dets) ]
      } else {
        this.request = cloneWC(dets)
      }
    } else if (eNum === 2) {
      if (this.response) {
        let old = this.response
        this.response = [ old, cloneWC(dets) ]
      } else {
        this.response = cloneWC(dets)
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
            let encoding = data.headers[ 'content-encoding' ]
            let dezipping = false
            if (encoding && encoding.indexOf('gzip') >= 0) {
              dezipping = true
              this.ungzip(data, resolve, reject)
            } else if (encoding && encoding.indexOf('deflate') >= 0) {
              dezipping = true
              this.inflate(data, resolve, reject)
            } else {
              this.rdata = data.body.toString()
            }
            if (!dezipping) {
              console.log('no gzipped')
              resolve()
            }
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


}



module.exports = {
  Resource,
  events
}