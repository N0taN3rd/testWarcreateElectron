const { Resource } = require('./resource')
const _ = require('lodash')

class RequestManager {
  constructor () {
    this.requests = new Map()
    this.rtypes = new Set()
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
    this.rtypes.clear()
  }

  serialize () {
    let resources = {}
    for (let [ url, r ] of this.requests) {
      resources[ url ] = r.serialize()
    }
    console.log(resources)
    return resources
  }

}

module.exports = RequestManager