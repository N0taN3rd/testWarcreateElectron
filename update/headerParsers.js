const _ = require('lodash')
const {STATUS_CODES}= require('http')
const url = require('url')

const headerStringHelper = (s, pair) => {
  if (Array.isArray(pair[1])) {
    return s + pair[1].reduce((ss, val) => ss + `${pair[0]}: ${val}\r\n`, '')
  }
  return s + `${pair[0]}: ${pair[1]}\r\n`
}

const requestHttpString = r => {
  if (!r || !r.url) {
    console.error(r)
  }
  return `${r.method} ${url.parse(r.url).path} HTTP/1.1\r\n`
}

const stringifyHeaders = (r, accessor) => _
  .sortBy(_.toPairs(r[accessor]), [0])
  .reduce((s, hpair) => headerStringHelper(s, hpair), '')

const makeHeaderString = (r, accessor, func) => func(r) + stringifyHeaders(r, accessor)

const responseHttpString = r => {
  let {statusLine, statusCode} = r
  if (statusLine.indexOf(STATUS_CODES[statusCode]) < 0) {
    console.log('badded we do not have the full status code', statusLine, statusCode, STATUS_CODES[statusCode])
    return `${statusLine.substr(0, 8)} ${statusCode} ${STATUS_CODES[statusCode]}\r\n`
  }
  return `${r.statusLine}\r\n`
}