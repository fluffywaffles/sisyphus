import {
  ᐅ,
  get,
  has,
  set,
  bind,
  reflex,
  fallible,
  update_path,
  map_properties,
} from '@prettybad/util'

const state = Symbol(`interceptor state`)

function Message (type) {
  return ({ payload, sender }) => {
    return { type, payload, sender }
  }
}

const message = {
  Result       : Message(`result`),
  Arguments    : Message(`arguments`),
  Continuation : Message(`continuation`),
}

function intercept_method (method) {
  return function intercepted_method (...argument_pack) {
    const result = method.apply(this, this[state].intercept(
      message.Arguments({ payload: argument_pack, sender: method }))
    )
    if (reflex.type.function(result)) {
      return bind(this)(intercept_method(this[state].intercept(
        message.Continuation({ payload: result, sender: method })
      )))
    } else {
      return this[state].intercept(
        message.Result({ payload: result, sender: method })
      )
    }
  }
}

function intercept_methods (message_receiver_iterator) {
  return object => ᐅ([
    map_properties(ᐅ([
      update_path([ 1 /* descriptor */, 'value' ])(intercept_method),
      fallible.unwrap,
    ])),
    set.descriptor.mut(state)({
      value: {
        target: object,
        receiver: message_receiver_iterator,
        intercept (message) {
          const [ next_receiver, { payload } ] = this.receiver(message)
          this.receiver = next_receiver
          return payload
        },
      },
    }),
  ])(object)
}

function release (object) {
  console.assert(has(state)(object), `
    object does not have interceptor state to release it from!
  `)
  return ᐅ([
    get(state),
    get.for_keys.values([ `receiver`, `target` ]),
  ])(object)
}

export {
  release,
  intercept_methods as methods,
}
