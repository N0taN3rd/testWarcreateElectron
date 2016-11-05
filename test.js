const request = require('request')
const rp = require('request-promise')
const Promise = require('bluebird')

function *it () {
  let req = request({
    method: 'GET',
    uri: 'https://github.com/N0taN3rd/wail/blob/module-split/tools/downloadExternals.js'
  })
  let me
  req.on('response', res => {
    yield res
  })

}

async function it2 () {
  let me = await it()
  return me
}

console.log(it2())

