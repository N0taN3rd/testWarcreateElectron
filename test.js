const Twit = require('twit')
const fs = require('fs-extra')
const twitter = Twit({

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