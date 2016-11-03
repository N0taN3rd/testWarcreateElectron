const cheerio = require('cheerio')
const fs = require('fs-extra')
const moment = require('moment')
const EventEmitter = require('eventemitter3')
const S = require('string')
const url = require('url')
const urlType = require('url-type')
const uuid = require('node-uuid')
const {
  warcHeader,
  warcHeaderContent,
  warcRequestHeader,
  warcResponseHeader,
  warcMetadataHeader
} = require('./warcFields')

const toPath = '/home/john/WebstormProjects/testWarcreateElectron/rs.json'

Set.prototype.difference = function (setB) {
  let difference = new Set(this)
  for (let elem of setB) {
    difference.delete(elem)
  }
  return difference
}

class WarcWritter extends EventEmitter {
  constructor () {
    super()
  }

  extractOutlinks (aUrl, theDom, preserveA = false) {
    let dom = cheerio.load(theDom)
    let ret = {
      outlinks: new Set()
    }
    if (preserveA) {
      ret.aTags = new Set()
    }

    dom('img').each(function (i, elem) {
      let outlink = elem.attribs.src
      if (outlink) {
        ret.outlinks.add(`${outlink} E =EMBED_MISC`)
      }
    })

    dom('style[href]').each(function (i, elem) {
      let outlink = elem.attribs.href
      if (outlink) {
        ret.outlinks.add(`${outlink} E =EMBED_MISC`)
      }
    })

    dom('script[src]').each(function (i, elem) {
      let outlink = elem.attribs.src
      if (outlink) {
        ret.outlinks.add(`${outlink} E script/@src`)
      }
    })

    dom('a').each(function (i, elem) {
      let outlink = elem.attribs.href
      if (outlink) {

        if (urlType.isRelative(outlink)) {
          console.log(aUrl, outlink)
          outlink = url.resolve(aUrl, outlink)
          console.log(outlink)
          console.log('---------------\n')
        } else {
          console.log(outlink)
          console.log('+++++++++++++++\n')
        }
        if (preserveA) {
          ret.aTags.add(outlink)
        }
        ret.outlinks.add(`${outlink} L a/@href`)
      }
    })
    return ret
  }

  writeWarc (aUrl, networkInfo, dtDom, preserveA = false) {
    let { doctype, dom }  = dtDom
    let { outlinks }  =  this.extractOutlinks(aUrl, dom, preserveA)
    console.log(doctype)
    let s1 = new Set(networkInfo.wcRequests.keys())
    let s2 = new Set(networkInfo.networkRequests.keys())
    for (let wtf of s1.difference(s2)) {
      if (wtf !== aUrl) {
        networkInfo.wcRequests.remove(wtf)
      }
    }

    let it = {}
    for (let [url,winfo] of networkInfo.wcRequests) {
      let ninfo = networkInfo.networkRequests.get(url)
      if (winfo.response.method !== 'POST') {
        if (aUrl === url) {
          console.log('we found net info for initial request')
          if (ninfo.response.headersText && ninfo.response.requestHeadersText) {
            let { headersText, requestHeadersText } = ninfo.response
            console.log(headersText, requestHeadersText)
          } else {
            console.log('baddd', url)
            let { requestHeaders } = winfo.request
            let { responseHeaders } = winfo.response
          }
        } else {
          if (ninfo) {

            if (ninfo.response.headersText && ninfo.response.requestHeadersText) {
              let { headersText, requestHeadersText } = ninfo.response
              console.log(headersText, requestHeadersText)
            } else {
              console.log('baddd', url)
              let { requestHeaders } = winfo.request
              let { responseHeaders } = winfo.response
            }
          }
        }
      }
      it[ url ] = {
        winfo, ninfo
      }
    }

    // this.extractOutlinks(aUrl, theDom, preserveA)

    // networkInfo.wcRequests.retrieve(aUrl)
    //   .then(() => {
    //     // let warcOut = fs.createWriteStream(toPath)
    //     // warcOut.on('end', () => {
    //     //   console.log('it endded')
    //     // })
    //     // warcOut.on('finish', () => {
    //     //   console.error('All writes are now complete.')
    //     //   warcOut.destroy()
    //     // })
    //     // for (let it of networkInfo.wcRequests.resources()) {
    //     //   if (it.rdata) {
    //     //     console.log(it)
    //     //     try {
    //     //       warcOut.write(it.rdata.body,'utf8')
    //     //     } catch (e) {
    //     //       console.error(e)
    //     //     }
    //     //   }
    //     //   warcOut.write('\r\n')
    //     // }
    //     // warcOut.end()
    //
    //   })
    // for (let [url,winfo] of networkInfo.wcRequests) {
    //   let ninfo = networkInfo.networkRequests.get(url)
    //   if (winfo.response.method !== 'POST') {
    //     if (aUrl === url) {
    //       console.log('we found net info for initial request', winfo, ninfo)
    //     } else {
    //       if (ninfo) {
    //         console.log(url)
    //         console.log('wcinfo', winfo.request, winfo.response)
    //         console.log('ninfo', ninfo.request, ninfo.response)
    //         console.log('---------------------\n\n')
    //       }
    //     }
    //   }
    // }
  }
}

module.exports = WarcWritter