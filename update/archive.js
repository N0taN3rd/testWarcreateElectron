const {ipcRenderer, remote} = require('electron')
const NetInterceptor = require('./netInterceptor')
const DebuggerUtil = require('./debuggerUtil')
const Promise = require('bluebird')
const WarcWriter = require('./warcWriter')
const _ = require('lodash')
const fs = require('fs-extra')
const url = require('url')
const prettyMs = require('pretty-ms')
const {extractOutLinks, makeLinkFun} = require('./extractLinks')
const ElectronArchiver = require('../update2/electronArchiver')
const chalk = require('chalk')

const toPath = '/home/john/WebstormProjects/testWarcreateElectron/maybeODUCS6.warc'

function noop () {}

class Archive {
  constructor (webview) {
    this.webview = webview
    this.wbReady = false
    this.archiveSeedQ = []
    this.crawlConfigKeptUrls = []
    this.onInitialSeed = true
    this.wasLoadError = false
    this.archiver = new ElectronArchiver()
    this.loadTimeout = null
    this.didPageLoadTimeoutHappen = false
    this._attachedArchiver = false
    this.preserving = false
    this.uri_r = ''
    this.seed = ''
    this.ipcMessage = this.ipcMessage.bind(this)
    this.pageLoaded = this.pageLoaded.bind(this)
    this.first = true
    this.loadTimedOutCB = this.loadTimedOutCB.bind(this)
    this.webview.addEventListener('did-stop-loading', (e) => {
      if (!this.wbReady) {
        console.log('we are loaded')
        ipcRenderer.send('archive-ready')
        this.wbReady = true
      }
    })
    this.webview.addEventListener('did-fail-load', (e) => {
      console.log('load failed', e)
      this.wasLoadError = true
    })
    this.archiver.on('error', (report) => {
      console.error('archiver error', report)
    })
    this.archiver.on('warc-gen-finished', async () => {
      console.log('warc gen finished')
      if (!this.first) {
        if (this.next_links.length > 0) {
          this.uri_r = this.next_links.shift()
          console.log(`Got ${this.next_links.length} more to go`)
          console.log(this.uri_r)
          await this.archive()
        }
      }
    })
    this.archiver.on('page-loaded', this.pageLoaded)
    this.webview.addEventListener('ipc-message', this.ipcMessage)
    ipcRenderer.on('archive', async (e, uri_r) => {
      this.uri_r = uri_r
      await this.archive()
    })
  }

  loadTimedOutCB () {
    console.log('timed out')
    this.pageLoaded(true)
      .then(noop)
      .catch(error => {
        console.error(error)
      })
  }

  async pageLoaded (fromTimeOut = false) {
    if (!this.preserving) {
      this.preserving = true
      clearTimeout(this.loadTimeout)
      this.loadTimeout = null
      console.log('page loaded from debugger')
      let mdata
      let mdataError = false
      try {
        mdata = await this.archiver.getMetadataSameD()
      } catch (error) {
        console.error('metadata get failed')
        mdataError = true
      }
      // try  {
      //   await this.archiver.doScroll()
      // } catch (error) {
      //   console.error('scroll error')
      //   console.error(error)
      // }
      // if (!fromTimeOut) {
      //   await Promise.delay(6000)
      // }
      this.webview.stop()
      this.archiver.stopCapturing()
      console.log('are we crashed', this.webview.isCrashed())
      let seedURL = this.webview.getURL()
      let UA = this.webview.getUserAgent()
      let links
      let outlinks
      if (!mdataError) {
        outlinks = mdata.result.value.outlinks
        links = mdata.result.value.links
      } else {
        outlinks = ''
        links = []
      }
      if (this.first) {
        this.first = false
        this.archiver.initWARC(toPath)
        // while(links.length >= 40) {
        //   links.shift()
        // }
        this.next_links = links
      } else {
        this.archiver.initWARC(toPath, true)
      }

      await this.archiver.genWarc({
        info: {
          v: '1.0.0',
          isPartOfV: 'ChromeCrawled',
          warcInfoDescription: ''
        },
        outlinks,
        UA,
        seedURL
      })
    }
  }

  async archive () {
    let webContents = this.webview.getWebContents()
    // will-download
    if (!this._attachedArchiver) {
      try {
        await this.archiver.setUp(webContents)
      } catch (error) {
        console.error('setup failed :(')
        console.error(error)
      }
      this._attachedArchiver = true
    }
    this.archiver.startCapturing()
    this.webview.loadURL(this.uri_r)
    this.loadTimeout = setTimeout(this.loadTimedOutCB, 15000)
    this.preserving = false
    // this.interceptor.clearRequests()
    // this.debuggerUtil.attach(webContents, this.uri_r).then(() => {
    //   console.log('attached')
    //   this.debuggerUtil.setupNetwork()
    //   this.webview.loadURL(this.uri_r)
    // }).catch(errA => {
    //   console.error(errA)
    // })
  }

  freshSession (webContents) {
    return new Promise((resolve, reject) => {
      let opts = {
        origin: webContents.getURL(),
        storages: ['appcache', 'filesystem', 'local storage']
      }
      webContents.session.clearStorageData(opts, () => {
        console.log('cleared storage data')
        resolve()
      })
    })
  }

  extractDoctypeDom (webContents) {
    return new Promise((resolve, reject) => {
      webContents.executeJavaScript('document.doctype.name', false, doctype => {
        webContents.executeJavaScript('document.documentElement.outerHTML', false, dom => {
          resolve({doctype, dom})
        })
      })
    })
  }

  ipcMessage (event) {
    if (event.channel === 'injected-archive') {
      let msg = event.args[0]
      if (msg === 'did-finish-load') {
        console.log('real did finish load')
        if (!this.wasLoadError) {
          this.wasLoadError = false
          // this.archiver.reqMonitor.stopCapturing()
          // for (let it of this.archiver.reqMonitor.entries()) {
          //   console.log(it)
          // }
          // this.interceptor.switchMapKeys()
          // this.debuggerUtil.getDom().then(({outerHTML}) => {
          //   let lf
          //   if (this._doingSeed) {
          //     lf = makeLinkFun('psd')
          //   } else {
          //     lf = makeLinkFun('po')
          //   }
          //   return this.debuggerUtil.extractLinks(lf).then(links => {
          //     this.interceptor.requests.get(this.uri_r).addSeedUrlBody(outerHTML)
          //     let {keep, outlinks} = links
          //     let opts = {
          //       seedUrl: this.uri_r, networkMonitor: this.interceptor,
          //       ua: this.webview.getUserAgent(),
          //       outlinks
          //     }
          //     process.nextTick(() => {
          //       if (this._doingSeed) {
          //         this._next = []
          //         console.log(this._next)
          //         this._doingSeed = false
          //         this.warcWritter.writeWarc(opts)
          //       } else {
          //         this.warcWritter.appendToWarc(opts)
          //       }
          //     })
          //   })
          // })
          //   .catch(lErr => {
          //     console.error(lErr)
          //   })
        } else {
          this.webview.loadURL(this.uri_r)
        }
      } else {
        console.log(msg)
      }
    }
  }
}

module.exports = Archive