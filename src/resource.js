const rp = require('request-promise')
const _ = require('lodash')
const Promise = require('bluebird')

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

class Resource {
  constructor (url, type, method) {
    this.requests = []
    this.method = method
    this.type = type
    this.url = url
    this.completed = false
    this.rdata = null
    this.getHeaders = null
  }

  add (event, dets) {
    if (events[ event ] === 4) {
      this.completed = true
    }
    if (events[ event ] === 1) {
      if (!this.getHeaders) {
        this.getHeaders = dets.requestHeaders
      }
    }
    this.requests.push({
      event,
      dets
    })
  }

  reqHeaders () {
    return _.filter(this.requests, r => r.method === 'GET')
  }

  dl () {
    return new Promise((resolve, reject) => {
      if (this.method !== 'POST') {
        rp({
          headers: this.getHeaders,
          encoding: null, //always get buffer
          method: 'GET',
          url: this.url,
          strictSSL: false,
          rejectUnauthorized: false,
          resolveWithFullResponse: true
        })
          .then(data => {
            this.rdata = data
            resolve()
          })
          .catch(error => reject(error))
      } else {
        resolve()
      }
    })
  }

  makeDL () {
    return function () {
      return new Promise((resolve, reject) => {
        if (this.method !== 'POST') {
          rp({
            headers: this.getHeaders,
            encoding: null, //always get buffer
            method: 'GET',
            url: this.url,
            strictSSL: false,
            rejectUnauthorized: false,
            resolveWithFullResponse: true
          })
            .then(data => {
              this.rdata = data
              resolve()
            })
            .catch(error => reject(error))
        } else {
          resolve()
        }
      })
    }
  }

  serialize () {
    return {
      type: this.type,
      method: this.method,
      completed: this.completed,
      requests: this.requests,
      firstHeaders: this.getHeaders
    }
  }
}

module.exports = {
  Resource,
  events
}