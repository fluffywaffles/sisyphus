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

function intercept_method ({
  previous_name,
  prefix = `intercept`,
  pass_name_to_continuations = true,
}) {
  return target => function intercepted (...argument_pack) {
    const name
      =  target.name
      || (pass_name_to_continuations && previous_name)
      || '<anonymous>'
    const result = target.apply(this, this[state].send(
      Message.Arguments({
        name,
        prefix,
        sender: target,
        payload: argument_pack,
      })
    ))
    if (reflex.type.function(result)) {
      return bind(this)(intercept_method({
        prefix,
        pass_name_to_continuations,
        previous_name: target.name,
      })(this[state].send(
        Message.Continuation({
          name,
          prefix,
          sender: target,
          payload: result,
        })
      )))
    } else {
      return this[state].send(
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
 * can at any time install a new reporter by returning it from the current
 * reporter, allowing us to dynamically select new reporters in response
 * to messages, or build up closure state in the reporter. Finally, the
 * last-invoked reporter and the original target object can be retrieved
 * by 'releasing' the intercepted object, and the current message-reporter
 * can be replaced externally by invoking `set_reporter`.
 *
 * It's therefore possible to:
 *
 * 1. Intercept the methods of an object
 * 2. 'Release' the object and retrieve the reporter
 * 3. Continue to use the reporter elsewhere
 * 4. 'Set' the reporter back on the intercepted object
 *
 * In other words: the same reporter can be used across potentially many
 * intercepted objects, across function boundaries and call stacks,
 * tracking across client code and library code, with abandon. You can
 * intercept usage in a client, return to the library, remove or replace
 * the interceptor, etc., etc.
 *
 * You can instrument everything. Let's start with tests.
 */
const noop_reporter = message => [ noop_reporter, message ]
function intercept_methods (
  methods,
  {
    prefix,
    previous_name,
    initial_reporter = noop_reporter,
    pass_name_to_continuations = true,
  } = {},
) {
  return object => ᐅ([
    set.descriptor.mut(state)({
      value: {
        target       : object,
        reporter     : initial_reporter,
        last_message : None,
        send (message) {
          set.values.mut({ last_message: message })(this)
          return this.receive(this.reporter(message))
        },
        receive ([ reporter, { payload } ]) {
          set.values.mut({ reporter })(this)
          return payload
        },
      },
    }),
    map_properties(ᐅwhen(([ key ]) => includes(key)(methods))(ᐅ([
      update_path([ 1 /* descriptor */, 'value' ])(intercept_method({
        prefix,
        previous_name,
        pass_name_to_continuations,
      })),
      ƒ.unwrap,
    ]))),
  ])(object)
}

function set_reporter (reporter) {
  return ᐅeffect(object => {
    console.assert(has(state)(object), `
      object does not have interceptor state to set the reporter of!
    `)
    ᐅ([ get(state), set.values.mut({ reporter }) ])(object)
  })
}

function release (object) {
  console.assert(has(state)(object), `
    object does not have interceptor state to release it from!
  `)
  return ᐅ([
    get(state),
    get.for_keys.values([ `reporter`, `last_message`, `target` ]),
  ])(object)
  // FIXME(jordan): bug in @prettybad/util, at_path is broken:
  // get.at_path.values([ state, [ `reporter`, `target` ] ])(object)
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
  set_reporter,
  intercept_method  as method,
  intercept_methods as methods,
}
