const wcRequestMonitor = require('./wcRequestMonitor')
const { clonner } = require('./util')

class NetworkMonitor {
  constructor () {
    this.wcRequests = new wcRequestMonitor()
    this.networkRequests = new Map()
  }

  requestWillBeSent (params) {
    let { request } = params
    if (!this.networkRequests.has(request.url)) {
      this.networkRequests.set(request.url, {
        request: clonner(request),
        response: null
      })
    } else {
      let oldRequest = this.networkRequests.get(request.url).request
      this.networkRequests.get(request.url).request = [ oldRequest, clonner(request) ]
    }

  }

  responseReceived (params) {
    let { response } = params
    if (this.networkRequests.has(response.url)) {
      if (!this.networkRequests.get(response.url).response) {
        this.networkRequests.get(response.url).response = clonner(response)

      } else {
        let oldResponse = this.networkRequests.get(response.url).response
        this.networkRequests.get(response.url).response = [ oldResponse, clonner(response) ]
      }
    }
  }

  attach (webContents) {
    this.wcRequests.attach(webContents)
    try {
      webContents.debugger.attach('1.1')
      webContents.debugger.on('detach', (event, reason) => {
        console.log('Debugger detached due to : ', reason)
      })
      webContents.debugger.sendCommand('Network.enable')
      webContents.debugger.on('message', (event, method, params) => {
        if (method === 'Network.requestWillBeSent') {
          this.requestWillBeSent(params)
        } else if (method === 'Network.responseReceived') {
          this.responseReceived(params)
        }
      })
    } catch (err) {
      console.log('Debugger attach failed : ', err)
      return false
    }
    return true
  }

  detach (webContents) {
    webContents.debugger.detach()
  }

}

module.exports = NetworkMonitor