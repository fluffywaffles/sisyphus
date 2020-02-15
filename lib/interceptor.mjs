import {
  ƒ,
  ᐅ,
  ᐅdo,
  ᐅif,
  ᐅlog,
  ᐅwhen,
  ᐅeffect,
  get,
  has,
  not,
  set,
  bind,
  copy,
  None,
  over,
  reflex,
  includes,
  update_path,
  map_properties,
} from '@prettybad/util'

const state = Symbol(`interceptor state`)

const Message = set.values.mut({
  Result ({ sender, payload, prefix, name }) {
    const type = 'result'
    return Message({ type, sender, payload, prefix, name })
  },
  Arguments ({ sender, payload, prefix, name }) {
    const type = 'arguments'
    return Message({ type, sender, payload, prefix, name })
  },
  Continuation ({ sender, payload, prefix, name }) {
    const type = 'continuation'
    return Message({ type, sender, payload, prefix, name })
  },
})(({ type, sender, payload, prefix, name = `<anonymous>` }) => {
    const description = `${prefix}/target:${name}/${type}`
    return { prefix, target: name, type, description, payload, sender }
})

function intercept_function ({
  previous_name,
  prefix = `intercept`,
  pass_name_to_continuations = true,
}) {
  return target => function intercepted (...argument_pack) {
    const name
      =  target.name
      || (pass_name_to_continuations && previous_name)
      || '<anonymous>'
    const result = target.apply(this, this[state].intercept(
      Message.Arguments({
        name,
        prefix,
        sender: target,
        payload: argument_pack,
      })
    ))
    if (reflex.type.function(result)) {
      return bind(this)(intercept_function({
        prefix,
        pass_name_to_continuations,
        previous_name: target.name,
      })(this[state].intercept(
        Message.Continuation({
          name,
          prefix,
          sender: target,
          payload: result,
        })
      )))
    } else {
      return this[state].intercept(
        Message.Result({
          name,
          prefix,
          sender: target,
          payload: result,
        })
      )
    }
  }
}

/* Invisible method interceptors.
 *
 * By attaching a piece of private state to an object (using the
 * `interceptor state` symbol defined above), we are able to invisibly,
 * statefully, intercept every argument pack to an arbitrary-arity curried
 * function method, intercept the result, and intercept every continuation
 * of the curried method; we can inspect and replace any of these; and we
 * can at any time install a new receiver by returning it from the current
 * receiver, allowing us to dynamically select new receivers in response
 * to messages, or build up closure state in the receiver. Finally, the
 * last-invoked receiver and the original target object can be retrieved
 * by 'releasing' the intercepted object, and the current message-receiver
 * can be replaced externally by invoking `set_receiver`.
 *
 * It's therefore possible to:
 *
 * 1. Intercept the methods of an object
 * 2. 'Release' the object and retrieve the receiver
 * 3. Continue to use the receiver elsewhere
 * 4. 'Set' the receiver back on the intercepted object
 *
 * In other words: the same receiver can be used across potentially many
 * intercepted objects, across function boundaries and call stacks,
 * tracking across client code and library code, with abandon. You can
 * intercept usage in a client, return to the library, remove or replace
 * the interceptor, etc., etc.
 *
 * You can instrument everything. Let's start with tests.
 */
const noop_receiver = message => [ noop_receiver, message ]
function intercept_methods (
  methods,
  {
    prefix,
    previous_name,
    initial_receiver = noop_receiver,
    pass_name_to_continuations = true,
  } = {},
) {
  return object => ᐅ([
    set.descriptor.mut(state)({
      value: {
        target       : object,
        receiver     : initial_receiver,
        last_message : None,
        intercept (message) {
          set.value.mut('last_message')(message)(this)
          const [ receiver, { payload } ] = this.receiver(message)
          set.values.mut({ receiver })(this)
          return payload
        },
      },
    }),
    map_properties(ᐅwhen(([ key ]) => includes(key)(methods))(ᐅ([
      update_path([ 1 /* descriptor */, 'value' ])(intercept_function({
        prefix,
        previous_name,
        pass_name_to_continuations,
      })),
      ƒ.unwrap,
    ]))),
  ])(object)
}

function set_receiver (receiver) {
  return ᐅeffect(object => {
    console.assert(has(state)(object), `
      object does not have interceptor state to set the receiver of!
    `)
    ᐅ([ get(state), set.values.mut({ receiver }) ])(object)
  })
}

function release (object) {
  console.assert(has(state)(object), `
    object does not have interceptor state to release it from!
  `)
  return ᐅ([
    get(state),
    get.for_keys.values([ `receiver`, `last_message`, `target` ]),
  ])(object)
  // FIXME(jordan): bug in @prettybad/util, at_path is broken:
  // get.at_path.values([ state, [ `receiver`, `target` ] ])(object)
}

function last_message (object) {
  console.assert(has(state)(object), `
    object does not have interceptor state to read the last message from!
  `)
  return ᐅ([ get(state), get(`last_message`) ])(object)
}

export {
  Message,
  release,
  last_message,
  set_receiver,
  intercept_methods  as methods,
  intercept_function as function,
}
