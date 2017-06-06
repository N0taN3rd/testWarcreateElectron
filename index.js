const {app, BrowserWindow, Menu, shell, ipcMain, dialog, session, protocol} = require('electron')
const getPort = require('get-port')
const path = require('path')
const Promise = require('bluebird')
const _ = require('lodash')
const normalizeUrl = require('normalize-url')

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

app.commandLine.appendSwitch('js-flags', '--harmony')
// app.commandLine.appendSwitch('enable-experimental-web-platform-features')
// app.commandLine.appendSwitch('ignore-gpu-blacklist')
// app.commandLine.appendSwitch('ignore-cpu-blacklist')

const template = require('./menuTemplate')

process.on('exit', (code) => {
  console.log(`About to exit with code: ${code}`)
})
const util = require('util')
process.on('uncaughtException', (err) => {
  console.log(`uncaughtException: ${err}`, err, err.stack)
})

process.on('unhandledRejection', (reason, p) => {
  console.log(reason, p)
})
process.on('warning', (warning) => {
  console.warn(warning.name)    // Print the warning name
  console.warn(warning.message) // Print the warning message
  console.warn(warning.stack)   // Print the stack trace
})
let mwindow

app.on('ready', () => {
  console.log('ready')
  require('electron-debug')({showDevTools: true})
  // mwindow.on('ready-to-show', () => {
  //   console.log('showing')
  //   // document.querySelector('#search_val').value
  // require('electron-debug')({showDevTools: true})
  // ipcMain.on('storage', (e, content) => {
  //   console.log('storage', content)
  // })
  // const menu = Menu.buildFromTemplate(template)
  // Menu.setApplicationMenu(menu)
  // const sesh = session.fromPartition('archive')
  mwindow = new BrowserWindow({
    show: false,
    webPreferences: {
      backgroundThrottling: false
    }
  })
  mwindow.loadURL(`file://${__dirname}/archive.html`)

  mwindow.webContents.on('did-stop-loading', () => {
    console.log('did-stop-loading')
  })
  //
  mwindow.webContents.on('did-finish-load', () => {
    mwindow.show()
    console.log('did-finish-load')
  })
})

// app.commandLine.appendSwitch('remote-debugging-port', '9222')

ipcMain.on('archive-ready', e => {
  console.log('archive-ready')
  // e.sender.send('archive', 'http://odu.edu/compsci')
  mwindow.webContents.send('archive', 'http://odu.edu/compsci')
})

ipcMain.on('message', (e, m) => {
  console.log(m)
})

let realQuit = false

app.on('window-all-closed', () => {
  app.quit()
})


