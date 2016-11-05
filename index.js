const { app, BrowserWindow, Menu, shell, ipcMain, dialog, session, protocol } =  require('electron')
const template = require('./menuTemplate')
// const Chrome = require('chrome-remote-interface')
process.on('exit', (code) => {
  console.log(`About to exit with code: ${code}`);
})
const util = require('util')
process.on('uncaughtException', (err) => {
  console.log(`uncaughtException: ${err}`, err, err.stack)
})

process.on('unhandledRejection', (reason, p) => {
  console.log(reason, p)
})
process.on('warning', (warning) => {
  console.warn(warning.name);    // Print the warning name
  console.warn(warning.message); // Print the warning message
  console.warn(warning.stack);   // Print the stack trace
})

app.commandLine.appendSwitch('js-flags', '--harmony')
// app.commandLine.appendSwitch('remote-debugging-port', '9222')
let mwindow
const dl = true

ipcMain.on('archive-ready', e => {
  console.log('archive-ready')
  e.sender.send('archive', 'http://odu.edu/compsci')
})

ipcMain.on('message', (e, m) => {
  console.log(m)
})

// ipcMain.on('got-dom', (e, dom) => {
//   console.log('got dom', dom)
// })
//
// ipcMain.on('injected', (e, m) => {
//   console.log(m)
// })
//
// ipcMain.on('reload', (e, m) => {
//   mwindow.reload()
// })

const loadWin = () => {
  require('electron-debug')({ showDevTools: true })
  ipcMain.on('storage', (e, content) => {
    console.log('storage', content)
  })
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
  // session.defaultSession.clearCache(() => console.log('done clear cache'))
  // session.defaultSession.clearStorageData(() => console.log('done clear cache'))

  // const ses = session.fromPartition('archive')
  mwindow = new BrowserWindow({
    show: false
    // webPreferences: {
    //   nodeIntegration: false,
    //   experimentalFeatures: true,
    //   plugins: true,
    //   session: ses,
    //   preload: `${__dirname}/src/inject.js`
    // }
  })
  mwindow.loadURL(`file://${__dirname}/archive.html`)

  mwindow.webContents.on('did-stop-loading', () => {
    console.log('did-stop-loading')
    // mwindow.webContents.send('archive','https://twitter.com/palewire')
  })
  mwindow.webContents.on('did-finish-load', () => {
    mwindow.show()
    console.log('did-finish-load')
    // mwindow.webContents.send('archive','https://twitter.com/palewire')
  })
}

app.on('ready', () => {
  loadWin()
  // if (process.env.NODE_ENV === 'development') {
  //   const installExtension = require('electron-devtools-installer')
  //   installExtension.default(installExtension[ 'REACT_DEVELOPER_TOOLS' ], dl)
  //     .then(name => {
  //       console.log('downloaded ',name)
  //       loadWin()
  //     })
  //     .catch(error => {
  //       console.error(error)
  //     })
  // }
})