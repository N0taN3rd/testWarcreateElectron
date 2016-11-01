console.log(window.__archive)
if (!window.__archive) {
  console.log('archive has not been created')
  const InjectArchive = require('./injectArchive')
  window.__archive = new InjectArchive()
}

process.once('loaded', () => {
  __archive.processLoaded()
})