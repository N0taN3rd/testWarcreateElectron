const EventEmitter = require('eventemitter3')
const Promise = require('bluebird')
const isEmpty = require('lodash/isEmpty')

class WebContentsDebugger extends EventEmitter {
  constructor () {
    super()
  }

  attach (wc) {
    this._wc = wc
    return new Promise((resolve, reject) => {
      try {
        this._wc.debugger.attach('1.2')
        this._wc.debugger.sendCommand('Page.enable', (errP) => {
          if (!_.isEmpty(errP)) {
            return reject(errP)
          }
          this._wc.debugger.sendCommand('DOM.enable', (errD) => {
            if (!_.isEmpty(errD)) {
              return reject(errD)
            }
            this._wc.debugger.sendCommand('Runtime.enable', (errR) => {
              if (!_.isEmpty(errR)) {
                return reject(errR)
              }
              this._wc.debugger.sendCommand('Network.enable', (errN) => {
                if (!_.isEmpty(errN)) {
                  return reject(errN)
                }
                resolve()
              })
            })
          })
        })
      } catch (err) {
        console.error(err)
        reject(err)
      }
    })
  }

  detach () {
    this._wc.debugger.detach()
  }
}