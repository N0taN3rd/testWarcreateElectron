const { ipcRenderer, remote } = require('electron')
const util = require('util')
const cheerio = require('cheerio')
const WarcWritter = require('./warcWriter')
const NetworkMonitor = require('./networkMonitor')
const Promise = require('bluebird')

const savePath = '/home/john/WebstormProjects/testWarcreateElectron/something/page.html'

class Archive {
  constructor (webview) {
    console.log('creating archive')
    this.webview = webview
    this.wbReady = false
    this.networkMonitor = new NetworkMonitor()
    this.warcWritter = new WarcWritter()
    this.url = ''
    this.webview.addEventListener('did-stop-loading', (e) => {
      console.log('it finished loading')
      if (!this.wbReady) {
        console.log('we are loaded')
        ipcRenderer.send('archive-ready')
        this.wbReady = true
      }
    })

    this.ipcMessage = this.ipcMessage.bind(this)
    this.webview.addEventListener('ipc-message', this.ipcMessage)
    ipcRenderer.on('archive', (e, url) => {
      this.url = url
      console.log(url)
      let webContents = this.webview.getWebContents()
      this.freshSession(webContents)
        .then(() => {
          this.networkMonitor.attach(webContents)
          this.webview.loadURL(url)

        })

      // this.webview.openDevTools()
    })
  }

  freshSession (webContents) {
    console.log('freshSession')
    return new Promise((resolve, reject) => {
      console.log('in promise')
      let opts = {
        origin: webContents.getURL(),
        storages: [ 'appcache', 'filesystem', 'local storage' ]
      }
      webContents.session.clearStorageData(opts, () => {
        console.log('cleared storage data')
        webContents.clearHistory()
        resolve()
      })

    })
  }

  extractDoctypeDom (webContents) {
    return new Promise((resolve, reject) => {
      webContents.executeJavaScript('document.doctype.name', false, doctype => {
        webContents.executeJavaScript('document.documentElement.outerHTML', false, dom => {
          resolve({ doctype, dom })
        })
      })
    })
  }

  ipcMessage (event) {
    if (event.channel === 'injected-archive') {
      let msg = event.args[ 0 ]
      if (msg === 'did-finish-load') {
        console.log('real did finish load')
        // this.webview.send('get-resources')
        let webContents = this.webview.getWebContents()
        this.networkMonitor.detach(webContents)
        this.webview.openDevTools()
        this.extractDoctypeDom(webContents)
          .then(ret => {
            this.warcWritter.writeWarc(this.url, this.networkMonitor, ret)
          })
      } else if (msg === 'resources') {
        let resources = event.args[ 1 ]
        this.warcWritter.writeWarc(this.url, this.networkMonitor, resources)
      } else {
        console.log(msg)
      }
    }
  }
}

module.exports = Archive