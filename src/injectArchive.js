class InjectArchive {
  constructor () {
    console.log('creating')
    let { ipcRenderer, remote } = require('electron')
    // let ResourceMan = require('./resourceManager')
    this.ipc = ipcRenderer
    this.log = console.log.bind(console)
    // this.cheerio = require('cheerio')
    this.remote = remote
    this.url = 'about:blank'
    // this.resourceManager = new ResourceMan()
    this.webContents = null
    this.stopLoadingTimer = null
    this.setTimeout = setTimeout
    this.clearTimeout = clearTimeout
    this.setLoadTimerCount = 0
    // this.resourceManager.clear()

    this.realDidFinishLoad = this.realDidFinishLoad.bind(this)
    this.getResources = this.getResources.bind(this)
    this.processLoaded = this.processLoaded.bind(this)
    this.beforeRedirect = this.beforeRedirect.bind(this)
    this.beforeSendHead = this.beforeSendHead.bind(this)
    this.receiveHead = this.receiveHead.bind(this)
    this.onComplete = this.onComplete.bind(this)

    this.ipc.on('get-resources', this.getResources)
    console.log(window.location.href)
  }

  realDidFinishLoad () {
    this.ipc.sendToHost('injected-archive', 'did-finish-load')
  }

  the_dom () {
    return this.cheerio.load(document.documentElement.outerHTML)
  }

  getResources (e) {
    this.log('getting info')
    this.ipc.sendToHost('injected-archive', 'resources', {
      theDom: document.documentElement.outerHTML
    })
    // this.ipc.sendToHost('injected-archive', 'getting-info')
    // console.log('get info')
    // let dom = this.cheerio.load()
    // let me = this
    // let outlinks = new Set()
    //
    // dom('img').each(function (i, elem) {
    //   me.log(elem)
    //   let outlink = elem.attribs.src
    //   if (outlink) {
    //     me.log(outlink)
    //     outlinks.add(`${outlink} E =EMBED_MISC`)
    //   }
    // })
    //
    // dom('style[href]').each(function (i, elem) {
    //   me.log(elem)
    //   let outlink = elem.attribs.href
    //   if (outlink) {
    //     me.log(outlink)
    //     outlinks.add(`${outlink} E =EMBED_MISC`)
    //   }
    // })
    //
    // dom('script[src]').each(function (i, elem) {
    //   me.log(elem)
    //   let outlink = elem.attribs.src
    //   if (outlink) {
    //     me.log(outlink)
    //     outlinks.add(`${outlink} E script/@src`)
    //   }
    // })
    //
    // dom('a').each(function (i, elem) {
    //   let outlink = dom(this).attr('href')
    //   if (outlink) {
    //     // me.log(outlink)
    //     outlinks.add(`${outlink} L a/@href`)
    //   }
    // })
    //
    // me.log(outlinks)

  }

  processLoaded () {
    if (window.location.href !== 'about:blank') {
      // console.log(this.url)
      let wc = this.remote.getCurrentWebContents()
      wc.on('did-stop-loading', () => {
        clearTimeout(this.stopLoadingTimer)
        this.stopLoadingTimer = setTimeout(() => {
          this.ipc.sendToHost('injected-archive', 'did-finish-load')
        }, 1000)
        // this.ipc.sendToHost('injected-archive', 'did-finish-load')
      })
    }
  }

  beforeSendHead (dets, cb) {
    this.requestManager.add('beforeSend', dets)
    cb({ cancel: false, requestHeaders: dets.requestHeaders })
  }

  receiveHead (dets, cb) {
    this.requestManager.add('receiveHead', dets)
    cb({ cancel: false, requestHeaders: dets.requestHeaders })
  }

  beforeRedirect (dets) {
    this.requestManager.add('beforeRedirect', dets)
  }

  onComplete (dets) {
    this.requestManager.add('complete', dets)
  }
}

module.exports = InjectArchive