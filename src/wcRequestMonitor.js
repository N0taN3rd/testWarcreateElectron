const { Resource } = require('./resource')
const _ = require('lodash')

const filter = {
  urls: [ 'http://*/*', 'https://*/*' ]
}

class wcRequestMonitor {
  constructor () {
    this.wcRequests = new Map()
  }

  attach (webContents) {
    this.wcRequests.clear()
    webContents.session.webRequest.onBeforeSendHeaders(filter, (dets, cb) => {
      this.add('beforeSend', dets)
      cb({ cancel: false, requestHeaders: dets.requestHeaders })
    })
    webContents.session.webRequest.onHeadersReceived(filter, (dets, cb) => {
      this.add('receiveHead', dets)
      cb({ cancel: false, requestHeaders: dets.requestHeaders })
    })
    webContents.session.webRequest.onBeforeRedirect(filter, (dets) => {
      this.add('beforeRedirect', dets)
    })
    webContents.session.webRequest.onCompleted(filter, (dets) => {
      this.add('complete', dets)
    })
  }

  add (event, dets) {
    if (!this.wcRequests.has(dets.url)) {
      this.wcRequests.set(dets.url, new Resource(dets.url, dets.resourceType, dets.method))
    }
    this.wcRequests.get(dets.url).add(event, dets)
  }

  retrieve (doNotInclude) {
    return Promise.all(Array.from(this.wcRequests.values()).filter(r => r.url !== doNotInclude).map(r => r.dl()))
  }

  filter (doNotInclude) {
    return Array.from(this.wcRequests.values()).filter(r => r.url !== doNotInclude)
  }

  getTypesResources (type) {
    return _.filter(Array.from(this.wcRequests.values()), r => r.type == type)
  }

  rTypesGrouped () {
    return _.groupBy(Array.from(this.wcRequests.values()), r => r.type)
  }

  remove (key) {
    this.wcRequests.delete(key)
  }

  keys () {
    return this.wcRequests.keys()
  }

  resources () {
    return this.wcRequests.values()
  }

  [Symbol.iterator] () {
    return this.wcRequests.entries()
  }

  clear () {
    this.wcRequests.clear()
  }

}

module.exports = wcRequestMonitor