const RequestManager = require('./resourceManager')
const { Resource } = require('./resource')
const _ = require('lodash')

class NetworkMonitor {
  constructor () {
    this.requests = new Map()
  }

  attach (webContents) {
    this.requests.clear()
    webContents.session.webRequest.onBeforeSendHeaders((dets, cb) => {
      this.add('beforeSend', dets)
      cb({ cancel: false, requestHeaders: dets.requestHeaders })
    })
    webContents.session.webRequest.onHeadersReceived((dets, cb) => {
      this.add('receiveHead', dets)
      cb({ cancel: false, requestHeaders: dets.requestHeaders })
    })
    webContents.session.webRequest.onBeforeRedirect((dets) => {
      this.add('beforeRedirect', dets)
    })
    webContents.session.webRequest.onCompleted((dets) => {
      this.add('complete', dets)
    })
  }

  add (event, dets) {
    console.log(event, dets)
    if (!this.requests.has(dets.url)) {
      this.requests.set(dets.url, new Resource(dets.url, dets.resourceType, dets.method))
    }
    this.requests.get(dets.url).add(event, dets)
  }

  retrieve () {
    return Promise.all(Array.from(this.requests.values()), r => r.dl())
  }

  getTypesResources (type) {
    return _.filter(this.requests.values(), r => r.type == type)
  }

  rTypesGrouped () {
    return _.groupBy(this.requests.values(), r => r.type)
  }

  resources () {
    return this.requests.values()
  }

  [Symbol.iterator] () {
    return this.requests.entries()
  }

  clear () {
    this.requests.clear()
  }

}

module.exports = NetworkMonitor