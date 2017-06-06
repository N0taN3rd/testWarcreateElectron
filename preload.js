console.log('preload')
function get_orig_getter (obj, prop) {
  let orig_getter
  if (obj.__lookupGetter__) {
    orig_getter = obj.__lookupGetter__(prop)
  }
  if (!orig_getter && Object.getOwnPropertyDescriptor) {
    let props = Object.getOwnPropertyDescriptor(obj, prop)
    if (props) {
      orig_getter = props.get
    }
  }
  return orig_getter
}

function get_orig_setter (obj, prop) {
  let orig_setter

  if (obj.__lookupSetter__) {
    orig_setter = obj.__lookupSetter__(prop)
  }

  if (!orig_setter && Object.getOwnPropertyDescriptor) {
    let props = Object.getOwnPropertyDescriptor(obj, prop)
    if (props) {
      orig_setter = props.set
    }
  }

  return orig_setter
}

function def_prop (obj, prop, set_func, get_func, enumerable) {
  // if the property is marked as non-configurable in the current
  // browser, skip the override
  let existingDescriptor = Object.getOwnPropertyDescriptor(obj, prop)
  if (existingDescriptor && !existingDescriptor.configurable) {
    return
  }

  // if no getter function was supplied, skip the override.
  // See https://github.com/ikreymer/pywb/issues/147 for context
  if (!get_func) {
    return
  }

  try {
    let descriptor = {
      configurable: true,
      enumerable: enumerable || false,
      get: get_func,
    }

    if (set_func) {
      descriptor.set = set_func
    }

    Object.defineProperty(obj, prop, descriptor)

    return true
  } catch (e) {
    console.warn('Failed to redefine property %s', prop, e.message)
    return false
  }
}

process.once('loaded', () => {
  const {remote} = require('electron')
  remote.getCurrentWebContents().on('did-start-loading', () => {
    console.log('did start loading')
  })
  // console.log('locaed')
  // console.log('locaed')
  // var oCookieGetter = get_orig_getter(window.Document.prototype, 'cookie')
  // var orig_set_cookie = get_orig_setter(window.Document.prototype, "cookie")
  // var myCookieGetter = function (val) {
  //   let cookie = oCookieGetter.call(this, val)
  //   console.log(cookie)
  //   return cookie
  // }
  // var set_cookie = function (value) {
  //   if (!value) {
  //     return
  //   }
  //   console.log(value)
  //   return orig_set_cookie.call(this, value)
  // }
  // def_prop(window.document, 'cookie', set_cookie, myCookieGetter)
})

