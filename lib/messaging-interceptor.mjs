import {
  ᐅ,
  ᐅif,
  not,
  bind,
  reflex,
  get,
  ᐅlog,
} from '@prettybad/util'

const MessageTypesForSender = sender => ({
  create: {
    Result (payload) {
      const type = `result`
      return { type, payload, sender }
    },
    Arguments (payload) {
      const type = `arguments`
      return { type, payload, sender }
    },
    Continuation (payload) {
      const type = `continuation`
      return { type, payload, sender }
    },
  },
})

export default function messaging_interceptor ({ map }) {
  return receiver => function intercept_function (target) {
    function send (message) {
      const [ next, { payload } ] = map.get(target).receive(message)
      map.set(target, { receive: next })
      return payload
    }
    const Message = MessageTypesForSender(target)
    map.set(target, { receive: receiver })
    return function intercepted_function (...argument_pack) {
      return ᐅ([
        ᐅ([ Message.create.Arguments, send ]),
        argument_pack => target.apply(this, argument_pack),
        ᐅif(not(reflex.type.function))(
          ᐅ([ Message.create.Result, send ])
        )(ᐅ([
          ᐅ([ Message.create.Continuation, send ]),
          continuation => intercept_function(continuation),
        ])),
      ])(argument_pack)
    }
  }
}

const interceptors = new WeakMap()
function add (a) {
  return (b) => a + b
}
const intercepted_add = messaging_interceptor({
  map: interceptors,
})(function receiver (message) {
  return [ receiver, ᐅlog(message) ]
})(add)
intercepted_add(1)(2)
