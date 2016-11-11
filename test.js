const Twit = require('twit')
const fs = require('fs-extra')
const twitter = Twit({
  consumer_key: 'K1y1GmSdDfUmBNMJeX1lf8Ono',
  consumer_secret: 'Ksd87lVkQWRVeXUIYjqqPF7mfUZuRq1aU1fgAFJHdDz3AY7NTY',
  access_token: '4844579470-y1a1kQePvEohKDp8RDfESX1whNRhlTm856JHWn3',
  access_token_secret: '46R2ynfMC8CmHzsd76UReneRGcPbuOaPAIhZVeMLKZD2f',
  timeout_ms: 60 * 1000,
})

const tweets = []
const stream = twitter.stream('statuses/filter', { track: [ 'ElectionNight', '#ElectionNight', 'Trump' ] })

stream.on('tweet', function (tweet) {
  console.log(tweet)
  tweets.push(tweet)
})

process.on('SIGTERM', () => {
  stream.stop()
  fs.writeJson('tweets.json',tweets,err => {
    if(err) console.error(err)
  })
})

process.on('SIGINT', () => {
  stream.stop()
  fs.writeJson('tweets.json',tweets,err => {
    if(err) console.error(err)
  })
})

process.once('SIGUSR2', () => {
  stream.stop()
  fs.writeJson('tweets.json',tweets,err => {
    if(err) console.error(err)
  })
})