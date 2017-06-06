const EventEmitter = require('eventemitter3')
const Promise = require('bluebird')
const isEmpty = require('lodash/isEmpty')
const ElectronRequestMonitor = require('./electronRequestMonitor')
const ElectronWARCGenerator = require('./electronWARCGenerator')
const chalk = require('chalk')

function killAllJsAlertPromptConfirm (win) {
  Object.defineProperty(win, 'onbeforeunload', {
    configurable: false,
    writeable: false,
    value: function () {}
  })
  Object.defineProperty(win, 'onunload', {
    configurable: false,
    writeable: false,
    value: function () {}
  })
  window.alert = function () {}
  window.confirm = function () {}
  window.prompt = function () {}
  win.alert = function () {}
  win.confirm = function () {}
  win.prompt = function () {}
}

const nnjs = {
  scriptSource: `(${killAllJsAlertPromptConfirm.toString()})(window);`
}

function metaData () {
  var ignore = ["#", "about:", "data:", "mailto:", "javascript:", "js:", "{", "*"]
  var len = ignore.length

  var outlinks = []
  $x('//img').forEach(it => {
    if (it.src !== '') {
      outlinks.push(`${it.src} E =EMBED_MISC\r\n`)
    }
  })
  $x('//script').forEach(it => {
    if (it.src !== '') {
      outlinks.push(`${it.src} E script/@src\r\n`)
    }
  })
  $x('//link').forEach(it => {
    if (it.href !== '') {
      outlinks.push(`${it.href} E link/@href\r\n`)
    }
  })
  var links = new Set()
  var i = 0
  var ignored = false
  Array.from(window.document.links).forEach(it => {
    if (it.href !== '') {
      ignored = false
      i = 0
      for (; i < len; ++i) {
        if (it.href.indexOf(ignore[i]) !== -1) {
          ignored = true
          break
        }
      }
      if (!ignored) {
        links.add(it.href)
      }
      outlinks.push(`outlink: ${it.href} L a/@href\r\n`)
    }
  })
  return {
    outlinks: outlinks.join(''),
    links: [...links]
  }
}

function metaDataSameD () {
  var ignore = ["#", "about:", "data:", "mailto:", "javascript:", "js:", "{", "*"]
  var len = ignore.length
  var outlinks = []
  var curHost = window.location.host
  $x('//img').forEach(it => {
    if (it.src !== '') {
      outlinks.push(`${it.src} E =EMBED_MISC\r\n`)
    }
  })
  $x('//script').forEach(it => {
    if (it.src !== '') {
      outlinks.push(`${it.src} E script/@src\r\n`)
    }
  })
  $x('//link').forEach(it => {
    if (it.href !== '') {
      outlinks.push(`${it.href} E link/@href\r\n`)
    }
  })
  var links = new Set()
  var i = 0
  var ignored = false
  Array.from(window.document.links).forEach(it => {
    if (it.href !== '') {
      ignored = false
      i = 0
      for (; i < len; ++i) {
        if (it.href.indexOf(ignore[i]) !== -1) {
          ignored = true
          break
        }
      }
      if (!ignored && it.host === curHost) {
        links.add(it.href)
      }
      outlinks.push(`outlink: ${it.href} L a/@href\r\n`)
    }
  })
  return {
    outlinks: outlinks.join(''),
    links: [...links]
  }
}

function scrollToBottom () {
  window.scrollTo(0,document.body.scrollHeight)
}

const metadata = {
  expression: `(${metaData.toString()})()`,
  includeCommandLineAPI: true,
  generatePreview: true,
  returnByValue: true
}

const metadataSameD = {
  expression: `(${metaDataSameD.toString()})()`,
  includeCommandLineAPI: true,
  generatePreview: true,
  returnByValue: true
}

const doScroll = {
  expression: `(${scrollToBottom.toString()})()`
}

class ElectronArchiver extends EventEmitter {
  constructor () {
    super()
    this.requestMonitor = new ElectronRequestMonitor()
    this._warcGenerator = new ElectronWARCGenerator()
    this.pageLoaded = this.pageLoaded.bind(this)
    this._onWARCGenFinished = this._onWARCGenFinished.bind(this)
    this._onWARCGenError = this._onWARCGenError.bind(this)
    this._warcGenerator.on('finished', this._onWARCGenFinished)
    this._warcGenerator.on('error', this._onWARCGenError)
  }

  attach (wc) {
    this._wc = wc
    return new Promise((resolve, reject) => {
      try {
        this._wc.debugger.attach('1.2')
        this._wc.debugger.sendCommand('Page.enable', (errP) => {
          if (!isEmpty(errP)) {
            return reject(errP)
          }
          this._wc.debugger.sendCommand('DOM.enable', (errD) => {
            if (!isEmpty(errD)) {
              return reject(errD)
            }
            this._wc.debugger.sendCommand('Runtime.enable', (errR) => {
              if (!isEmpty(errR)) {
                return reject(errR)
              }
              this._wc.debugger.sendCommand('Network.enable', (errN) => {
                if (!isEmpty(errN)) {
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

  async setUp (wc) {
    await this.attach(wc)
    this.requestMonitor.attach(this._wc.debugger)
    try {
      let nnjs_id = await this._doNoNaughtyJs()
      console.log('no naughty good', nnjs_id)
    } catch (error) {
      console.error('No naughty failed :(')
      console.error(error)
    }
    this._wc.debugger.on('message', (event, method, params) => {
      // console.log(method)
      if (method === 'Page.loadEventFired') {
        // Promise.delay(5000).then(this.pageLoaded)
        this.emit('page-loaded')
      }
    })
  }

  initWARC (warcPath, appending = false) {
    this._warcGenerator.initWARC(warcPath, appending)
  }

  async genWarc ({info, outlinks, UA, seedURL}) {
    await this._warcGenerator.writeWarcInfoRecord(info.v, info.isPartOfV, info.warcInfoDescription, UA)
    await this._warcGenerator.writeWarcMetadataOutlinks(seedURL, outlinks)
    for (let nreq of this.requestMonitor.values()) {
      if (nreq.redirectResponse) {
        await this._warcGenerator.generateRedirectResponse(nreq, this._wc.debugger)
      } else {
        switch (nreq.method) {
          case 'POST':
            await this._warcGenerator.generatePost(nreq, this._wc.debugger)
            break
          case 'GET':
            await this._warcGenerator.generateGet(nreq, this._wc.debugger)
            break
          case 'OPTIONS':
            await this._warcGenerator.generateOptions(nreq, this._wc.debugger)
            break
          default:
            console.log(nreq.method)
        }
      }
    }
    this._warcGenerator.end()
  }

  startCapturing () {
    this.requestMonitor.startCapturing()
  }

  stopCapturing () {
    this.requestMonitor.stopCapturing()
  }

  getMetadata () {
    return new Promise((resolve, reject) => {
      this._wc.debugger.sendCommand('Runtime.evaluate', metadata, (err, results) => {
        if (!isEmpty(err)) {
          return reject(err)
        }
        resolve(results)
      })
    })
  }

  getMetadataSameD () {
    return new Promise((resolve, reject) => {
      this._wc.debugger.sendCommand('Runtime.evaluate', metadataSameD, (err, results) => {
        if (!isEmpty(err)) {
          return reject(err)
        }
        resolve(results)
      })
    })
  }

  doScroll () {
    return new Promise((resolve, reject) => {
      this._wc.debugger.sendCommand('Runtime.evaluate', doScroll, (err, results) => {
        if (!isEmpty(err)) {
          return reject(err)
        }
        resolve()
      })
    })
  }

  pageLoaded () {
    this.emit('page-loaded')
  }

  /**
   * @desc Listener for warc generator error
   * @param {Error} err
   * @private
   */
  _onWARCGenError (err) {
    this.emit('error', {type: 'warc-gen', err})
  }

  /**
   * @desc Listener for warc generator finished
   * @private
   */
  _onWARCGenFinished () {
    this.emit('warc-gen-finished')
  }

  _doNoNaughtyJs () {
    return new Promise((resolve, reject) => {
      this._wc.debugger.sendCommand('Page.addScriptToEvaluateOnLoad', nnjs, (err, ret) => {
        if (!isEmpty(err)) {
          return reject(err)
        }
        resolve(ret)
      })
    })
  }

  detach () {
    this._wc.debugger.detach()
  }
}

module.exports = ElectronArchiver
