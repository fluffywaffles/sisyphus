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

function set_receiver (new_receiver) {
  return object => {
    console.assert(has(state)(object), `
      object does not have interceptor state to set the receiver of!
    `)
    return set.at_path.value([ state, 'receiver' ])(new_receiver)(object)
  }
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
  set_receiver,
  intercept_methods as methods,
}
