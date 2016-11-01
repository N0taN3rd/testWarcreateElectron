import React, {Component, PropTypes} from 'react'
import ReactDOM from 'react-dom'
import {changableProps, events, methods} from './webviewConsts'
import _ from 'lodash'

class ArchiveWebview extends Component {

  constructor (...args) {
    super(...args)
    this.container = null
  }

  componentDidMount () {
    const container = ReactDOM.findDOMNode(this.container)
    let propString = '';
    Object.keys(props).forEach((propName) => {
      if (typeof this.props[ propName ] !== 'undefined') {
        if (typeof this.props[ propName ] === 'boolean') {
          propString += `${propName}="${this.props[ propName ] ? 'on' : 'off'}" `
        } else {
          propString += `${propName}=${JSON.stringify(this.props[ propName ].toString())} `
        }
      }
    })
    if (this.props.className) {
      propString += `class="${this.props.className}" `
    }
    container.innerHTML = `<webview ${propString}/>`
    this.view = container.querySelector('webview')

    this.ready = false;
    this.view.addEventListener('did-attach', (...attachArgs) => {
      this.ready = true;
      events.forEach((event) => {
        this.view.addEventListener(event, (...eventArgs) => {
          const propName = camelCase(`on-${event}`);
          // console.log('Firing event: ', propName, ' has listener: ', !!this.props[propName]);
          if (this.props[ propName ]) this.props[ propName ](...eventArgs)
        })
      })
      if (this.props.onDidAttach) this.props.onDidAttach(...attachArgs)
    })
  }

  render () {
    return (
      <div ref={(c) => { this.container = c }} style={this.props.style || {}}/>
    )
  }

}
ArchiveWebview.propTypes = {
  src: PropTypes.string,
  autosize: PropTypes.bool,
  nodeintegration: PropTypes.bool,
  plugins: PropTypes.bool,
  preload: PropTypes.string,
  httpreferrer: PropTypes.string,
  useragent: PropTypes.string,
  disablewebsecurity: PropTypes.bool,
  partition: PropTypes.string,
  allowpopups: PropTypes.bool,
  blinkfeatures: PropTypes.string,
  disableblinkfeatures: PropTypes.string,
  guestinstance: PropTypes.number,
  devtools: PropTypes.bool,
  muted: PropTypes.bool,
  webpreferences: PropTypes.string,
}

events.forEach((event) => {
  ArchiveWebview.propTypes[_.camelCase(`on-${event}`)] = PropTypes.func
})

export default ArchiveWebview
