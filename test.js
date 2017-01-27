const fs = require('fs-extra')
const _ = require('lodash')
const fp = require('lodash/fp')
const prettyMs = require('pretty-ms')
const moment = require('moment')
const URL = require('url')
const through2 = require('through2')
const split2 = require('split2')
const rp = require('request-promise')
const util = require('util')
const S = require('string')
/*
 wail config crawl
 13,248 downloaded + 0 queued = 13,248 total
 1.2 GiB crawled (1.2 GiB novel, 0 B dupByHash, 0 B notModified)
 Elapsed
 7h24m23s265ms
 */

const inspect = _.partialRight(util.inspect, {depth: null, colors: true})

const getExts = fp.flow(
  fp.reduce((acum, it) => {
    acum.start.push(it.start)
    acum.stop.push(it.stop)
    return acum
  }, {start: [], stop: []}),
  fp.mapValues((v, k) => {
    if (k === 'start') {
      return _.min(v)
    } else {
      return _.max(v)
    }
  })
)

const linkStats = fp.flow(
  fp.toPairs,
  fp.map(pair => {
    let [link, info] = pair
    // console.log(link, info)
    return {
      link,
      stop: info.stop,
      time: info.stop - info.start,
      timeH: prettyMs(info.stop - info.start),
      resources: info.resources.resourceUrls.length,
      linksInPage: info.links.length
    }
  })
)

const linkTiming = fp.flow(
  fp.valuesIn,
  fp.map(it => it.stop - it.start),
  fp.chunk(2),
  fp.flatMap(([a, b]) => Math.abs(b - a))
)

const meanResources = fp.flow(
  fp.map(it => it.resources),
  fp.mean
)
// console.log(moment('2017-01-23T08:24:02').format('dddd, MMMM Do YYYY, h:mm:ss a'))

const timming = times => {
  let {stop, start} = getExts(_.valuesIn(times))
  let time = stop - start

  console.log(prettyMs(time))
  console.log(meanResources(linkStats(times)))
  // let linkTimming = linkTiming(times)
  // console.log(prettyMs(_.mean(linkTimming)))
}
const poResources = [
  "https://pbs.twimg.com/profile_images/598110235920834560/lFLE-mX7_bigger.png",
  "https://abs.twimg.com/k/en/9.pages_home.en.4e7637eb9f2ddf8804e6.js",
  "https://pbs.twimg.com/media/C2FDIDYWIAA_nx1.jpg",
  "https://abs.twimg.com/k/en/init.en.38255812c7627517cc63.js",
  "https://pbs.twimg.com/profile_images/378800000635279956/062717d96d474df009b302dd65197c91_normal.jpeg",
  "https://pbs.twimg.com/profile_images/694021299891343360/CVACQUXm_normal.jpg",
  "https://abs.twimg.com/k/en/26.commons.en.8a175162a4b4342677f1.js",
  "https://syndication.twitter.com/i/jot/syndication?l=%7B%22_category_%22%3A%22syndicated_impression%22%2C%22event_namespace%22%3A%7B%22client%22%3A%22web%22%2C%22page%22%3A%22profile%22%2C%22action%22%3A%22impression%22%7D%2C%22triggered_on%22%3A1485139707863%7D",
  "https://pbs.twimg.com/profile_images/804416864621305856/qtt-8OYm_bigger.jpg",
  "https://abs.twimg.com/hashflags/NFL_Season_2016_ATL/NFL_Season_2016_ATL.png",
  "https://pbs.twimg.com/profile_images/466648768389980160/3m8QCmnl_bigger.jpeg",
  "https://pbs.twimg.com/profile_images/707802054643863552/0qY4GvI9_bigger.jpg",
  "https://pbs.twimg.com/profile_images/598110235920834560/lFLE-mX7_normal.png",
  "https://pbs.twimg.com/media/Cz5ZhABXcAAdAfE.jpg",
  "https://pbs.twimg.com/profile_images/378800000539230160/8ff570dd36c5ebc454d0b2a7c704c959_normal.png",
  "https://pbs.twimg.com/profile_images/691507288901685249/mMYopFJn_bigger.jpg",
  "https://pbs.twimg.com/media/CwHIwyGVUAAWU6I.jpg",
  "https://pbs.twimg.com/profile_images/681701447973470212/27uSdDTM_bigger.jpg",
  "https://pbs.twimg.com/media/Cz5ZhC5WEAAtcln.jpg",
  "https://pbs.twimg.com/profile_images/508703870755688448/G5d60JOt_bigger.jpeg",
  "https://abs.twimg.com/a/1484798585/font/rosetta-icons-Regular.woff",
  "https://pbs.twimg.com/profile_images/750715520534675456/RD0TeRLZ_bigger.jpg",
  "https://abs.twimg.com/hashflags/NFL_Season_2016_NE/NFL_Season_2016_NE.png",
  "https://pbs.twimg.com/profile_images/572925616815476736/GamSQTez_bigger.jpeg",
  "https://pbs.twimg.com/profile_images/959295176/mln-ad-100x130_bigger.jpg",
  "https://pbs.twimg.com/media/Cxjmp0SUsAAUv2p.png",
  "https://pbs.twimg.com/profile_images/466648768389980160/3m8QCmnl_normal.jpeg",
  "https://pbs.twimg.com/profile_images/694021299891343360/CVACQUXm_bigger.jpg",
  "https://abs.twimg.com/a/1484798585/img/t1/spinner-rosetta-gray-32x32.gif",
  "https://pbs.twimg.com/profile_images/378800000539230160/8ff570dd36c5ebc454d0b2a7c704c959_400x400.png",
  "https://pbs.twimg.com/profile_images/1450384802/ukwa-3_bigger.JPG",
  "https://pbs.twimg.com/media/Cy7IKQmVQAAkXXC.jpg",
  "https://www.google-analytics.com/collect?v=1&_v=j47&aip=1&a=1585222617&t=pageview&_s=1&dl=https%3A%2F%2Ftwitter.com%2FWebSciDL&dp=%2Fanon%2Fprofile%2Fprofile&ul=en-us&de=UTF-8&dt=WS-DL%20Group%2C%20ODU%20CS%20(%40WebSciDL)%20%7C%20Twitter&sd=24-bit&sr=1920x1080&vp=785x585&je=0&_u=QGAAgQAB~&jid=236415789&cid=1764594778.1485139708&tid=UA-30775-6&z=984433205",
  "https://pbs.twimg.com/profile_images/959295176/mln-ad-100x130_normal.jpg",
  "https://stats.g.doubleclick.net/r/collect?t=dc&aip=1&_r=3&v=1&_v=j47&tid=UA-30775-6&cid=1764594778.1485139708&jid=236415789&_u=QGAAgQAB~&z=783243011",
  "https://abs.twimg.com/a/1484798585/img/animations/web_heart_animation.png"
]
// const
const unSurt = surt => {
  let idx = surt.indexOf(')/')
  let parts = surt.substr(0, idx).split(',')
  let rest = surt.substr(idx + 1)
  let openB = rest.indexOf('{')
  if (openB > 0) {
    let other = rest.substr(openB)
    rest = rest.substr(0, openB) + encodeURIComponent(other)
  }
  return parts.reverse().join('.') + rest
}
const cdxQToJsonArray = fp.flow(
  fp.map(JSON.parse),
  fp.map(it => {
    it.url = unSurt(it.urlkey)
    return it
  })
)
const optCreator = (col, what) => ({
  uri: `http://localhost:8080/${col}-cdx?${what}&output=json`,
  transform(body) {
    let splitted = body.split('\n')
    splitted.splice(-1, 1)
    return _.map(splitted, it => {
      let json = JSON.parse(it)
      json.url = unSurt(json.urlkey)
      return json
    })
  }
})

const getCDXJInfo = fp.flow(
  str => str.split(' ')[2],
  JSON.parse,
  fp.pick(['url', 'mime', 'status', 'length', 'digest']),
  it => {
    let parsed = URL.parse(it.url)
    parsed.protocol = null
    it.url = URL.format(parsed)
    if (it.url.startsWith('//')) {
      it.url = it.url.substr(2)
    }
    return it
  }
)

const countDuplicates = fp.flow(
  fp.map(item => {
    let parsed = URL.parse(item.url, true)
    if (parsed.query['lang'] && parsed.query['lang'] !== 'en') {
      return parsed.protocol + parsed.hostname + parsed.pathname + '?lang'
    }
    return parsed.protocol + parsed.hostname + parsed.pathname
  }),
  fp.countBy(fp.identity),
  fp.toPairs,
  fp.reduce((acum, [k, v]) => {
    if (v === 1) {
      acum['1'] = _.get(acum, '1', 0) + 1
    } else {
      let langIdx = k.indexOf('lang')
      if (langIdx > 0) {
        k = k.substr(0, langIdx)
        if (acum[k]) {
          acum[k].langCount = v
        } else {
          acum[k] = {
            langCount: v
          }
        }
      } else {
        acum[k] = {
          original: v
        }
      }
    }
    return acum
  }, {}),
  fp.toPairs,
  fp.reduce((acum, [k, v]) => {
    if (k === '1') {
      acum['1'] = v
    } else {
      let mobileIdx = k.indexOf('mobile.')
      if (mobileIdx === 0) {
        k = k.substr(7)
      }
      if (!acum[k]) {
        acum[k] = {}
      }
      if (mobileIdx === 0) {
        acum[k].mobile = v
      } else {
        acum[k].normal = v
      }
    }
    return acum
  }, {})
)

const countStatuses = fp.flow(
  fp.groupBy(it => it.status),
  fp.mapValues(v => ({
    len: v.length,
    urls: v
  }))
)

const groupByMime = fp.flow(
  fp.groupBy(it => it.mime),
  fp.mapValues((v, k) => ({
    statuses: countStatuses(v),
    dups: countDuplicates(v),
    number: v.length
  }))
)

const countDuplicateByMime = fp.flow(
  fp.groupBy(it => it.mime),
  fp.mapValues((v, k) => ({
    dups: countDuplicates(v),
    number: v.length
  }))
)

const countMime = fp.flow(
  fp.groupBy(it => it.mime),
  fp.mapValues((v, k) => ({
    urls: _.map(v, fp.pick(['url', 'digest'])),
    len: v.length
  }))
)

const isLang = k => {
  let it = [k.indexOf('lang'), k.indexOf('?lang')]
  if (it[0] !== -1 && it[1] !== -1) {
    return it[1]
  } else if (it[0] !== -1) {
    return it[0]
  } else {
    return -1
  }
}

const isLocal = k => {
  let it = [k.indexOf('locale'), k.indexOf('?locale')]
  if (it[0] !== -1 && it[1] !== -1) {
    return it[1]
  } else if (it[0] !== -1) {
    return it[0]
  } else {
    return -1
  }
}

const nukeLang = (k, parsed) => {
  let it = k.substr(0, k.indexOf('lang')) + k.substr(k.indexOf('lang') + `lang=${parsed.query['lang']}`.length)
  if (it[it.length - 1] === '&' || it[it.length - 1] === '?') {
    return it.substr(0, it.length - 1)
  } else {
    return it
  }
}
const nukeLocale = (k, parsed) => {
  let it = k.substr(0, k.indexOf('locale')) + k.substr(k.indexOf('locale') + `locale=${parsed.query['locale']}`.length)
  if (it[it.length - 1] === '&' || it[it.length - 1] === '?') {
    return it.substr(0, it.length - 1)
  } else {
    return it
  }
}
const getK = k => {
  let parsed = URL.parse(k, true)
  let lang = false
  let ret = k
  if (parsed.query['lang']) {
    return [nukeLang(k, parsed), parsed.query['lang'] !== 'en']
  }
  if (parsed.query['locale']) {
    return [nukeLocale(k, parsed), parsed.query['locale'] !== 'en']
  }
  return [ret, lang]
}

const countHtmlDupLang = fp.flow(
  fp.reduce((acum, it) => {
    let [k, lang] = getK(it.url)
    if (lang) {
      if (acum[k]) {
        acum[k].langCount += 1
      } else {
        acum[k] = {
          original: 0,
          langCount: 1
        }
      }
    } else {
      if (acum[k]) {
        acum[k].original += 1
      } else {
        acum[k] = {
          original: 1,
          langCount: 0
        }
      }
    }
    return acum
  }, {}),
  fp.toPairs,
  fp.reduce((acum, [k, v]) => {
    let mobileIdx = k.indexOf('mobile.')
    if (mobileIdx === 0) {
      k = k.substr(7)
    }
    if (!acum[k]) {
      acum[k] = {}
    }
    if (mobileIdx === 0) {
      acum[k].mobile = v
    } else {
      acum[k].normal = v
    }
    return acum
  }, {})
)

const parseCdxj = path => new Promise((resolve, reject) => {
  const rstream = fs.createReadStream(path, {encoding: 'utf8'})
  const urls = []
  rstream
    .pipe(split2())
    .pipe(through2.obj(function (item, enc, next) {
      console.log(item.split(' ')[0])
      urls.push(getCDXJInfo(item))
      next()
    }))
    .on('finish', () => {
      rstream.destroy()
      resolve(urls)
    })
})

const doIT = async () => {
  const info = await parseCdxj('/home/john/WebstormProjects/testWarcreateElectron/collections/hWC/indexes/index.cdxj')
  let len = info.length, i = 0
  let statusCount = countStatuses(info)
  let twoHundos = statusCount['200']
  // console.log(_.groupBy(twoHundos.urls, it => it.url))
  let mimeCount = countMime(twoHundos.urls)
  let htmls = mimeCount['text/html']
  console.log(countHtmlDupLang(htmls.urls))
}

doIT().then(() => {

})
// 'http://localhost:8080/wailPo-cdx?url=https://twitter.com/WebSciDL&output=json'
// rp(optCreator('wailPo', 'url=*.twitter.com'))
//   .then(result => {
//     console.log(result)
//   })
// console.log(URL.parse('https://syndication.twitter.com/i/jot/syndication?l=%7B%22_category_%22%3A%22syndicated_impression%22%2C%22event_namespace%22%3A%7B%22client%22%3A%22web%22%2C%22page%22%3A%22profile%22%2C%22action%22%3A%22impression%22%7D%2C%22triggered_on%22%3A1485139707863%7D',true))
// fs.readJSON('/home/john/WebstormProjects/testWarcreateElectron/pageOnly.json', (err, crawlStats) => {
// console.log(encodeURIComponent('{"_category_":"syndicated_impression","event_namespace":{"client":"web","page":"profile","action":"impression"},"triggered_on":1485139707863}'))
//   console.log(crawlStats)

// canonicalize('https://twitter.com/WebSciDL')

// fs.readJSON('/home/john/WebstormProjects/testWarcreateElectron/pageSD.json', (err, mimeBd) => {
//   let {stop, start} = getExts(_.valuesIn(mimeBd))
//   let time = stop - start
//
//   console.log(prettyMs(time))
//   console.log(meanResources(linkStats(mimeBd)))
//   // let linkTimming = linkTiming(mimeBd)
//   // console.log(prettyMs(_.mean(linkTimming)))
//
// })
