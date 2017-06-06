const fs = require('fs-extra')
const Promise = require('bluebird')

function arrayToObject (parameters) {
  const keyValue = {}
  parameters.forEach(function (parameter) {
    const name = parameter.name
    delete parameter.name
    keyValue[name] = parameter
  })
  return keyValue
}

function decorate (to, category, object) {
  to.category = category
  Object.keys(object).forEach(function (field) {
    // skip the 'name' field as it is part of the function prototype
    if (field === 'name') {
      return
    }
    // commands and events have parameters whereas types have properties
    if (category === 'type' && field === 'properties' ||
      field === 'parameters') {
      to[field] = arrayToObject(object[field])
    } else {
      to[field] = object[field]
    }
  })
}

function addCommand (chrome, domainName, command) {
  const handler = function (params, callback) {
    return chrome.send(domainName + '.' + command.name, params, callback)
  }
  decorate(handler, 'command', command)
  chrome[domainName][command.name] = handler
}

function addEvent (chrome, domainName, event) {
  const eventName = domainName + '.' + event.name
  const handler = function (handler) {
    if (typeof handler === 'function') {
      chrome.on(eventName, handler)
    } else {
      return new Promise(function (fulfill, reject) {
        chrome.once(eventName, fulfill)
      })
    }
  }
  decorate(handler, 'event', event)
  chrome[domainName][event.name] = handler
}

function addType (chrome, domainName, type) {
  const help = {}
  decorate(help, 'type', type)
  chrome[domainName][type.id] = help
}

function prepare (protocol) {
  const chrome = {}
  return new Promise(function (fulfill, reject) {
    // assign the protocol and generate the shorthands
    chrome.protocol = protocol
    protocol.domains.forEach(function (domain) {
      const domainName = domain.domain
      chrome[domainName] = {}
      // add commands
      (domain.commands || []).forEach(function (command) {
        addCommand(chrome, domainName, command)
      })
      // add events
      (domain.events || []).forEach(function (event) {
        addEvent(chrome, domainName, event)
      })
      // add types
      (domain.types || []).forEach(function (type) {
        addType(chrome, domainName, type)
      })
    })
    fulfill(chrome)
  })
}

async function doIt () {
  const protocol = await fs.readJson('/home/john/WebstormProjects/testWarcreateElectron/update2/protocol.json')
  const api = await prepare(protocol)
  console.log(api)
}

doIt().then(() => {

}).catch(error => {
  console.error(error)
})