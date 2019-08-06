import {
  ᐅ,
  ᐅif,
  ᐅlog,
  ᐅwhen,
  id,
  get,
  set,
  bind,
  call,
  None,
  apply,
  times,
  reflex,
  update,
  fallible,
  map_properties,
} from '@prettybad/util'
/* NOTE(jordan): proof-of-concept iterator-based interceptors! This will
 * allow us to simply pass the reporter_iterator into the interceptor, and
 * get back at the end the reporter_iterator for `test:result`. It was
 * blocking for a while that I didn't have a solution for chaining
 * reporters inside of the intercepted assertion function. I ended up with
 * the very hacky `stateful` processor garbage that currently is used,
 * just to get the thing to work at all. Now, we will be able to get rid
 * of `stateful`. Additionally, we can detect the result of individual
 * assertions separately from the result of the whole test, without
 * resorting to assumptions about assertion function arity like we do
 * currently. (We assume all assertions are arity 2, which has unfortunate
 * effects for reporting when a `t.ok` fails.) In fact, by combining
 * make_aggregator (or a simplified version of it) with a plain functional
 * iterator that invokes the correct message receivers based on message
 * type, we should be able to export a very straightforward `Reporter`
 * constructor that library users can use to create custom reporters.
 * We'll also actually be able to implement the diffing functionality
 * described in `testing-in-anger' that looked for a while like it
 * wouldn't actually be possible.
 *
 * As a small bonus, the way functional iterators work is naturally also a
 * trampoline, so we should not have any call-stack troubles.
 */
function intercept1 (interceptor_iterator) {
  return fn => argument_pack => {
    const [ next_iterator, intercepted_argument_pack ]
          = interceptor_iterator(argument_pack)
    const result = fn(...intercepted_argument_pack)
    return next_iterator(result)
  }
}

/* Basically, until the result is no longer a function, continue
 * unwrapping and chaining calls to intercept1. As soon as the result is a
 * non-function, return the final [ iterator, value ] pair.
 */

function intercept (interceptor_iterator) {
  return fn => (...argument_pack) => ᐅ([
    intercept1(interceptor_iterator)(fn),
    ᐅwhen(ᐅ([ get(1), reflex.type(`function`) ]))(apply(intercept)),
  ])(argument_pack)
}

function log_argument_pack (argument_pack) {
  console.log(`intercept: argument_pack intercepted:`, argument_pack)
  return [ detect_and_log_result, argument_pack ]
}

function detect_and_log_result (result) {
  if (reflex.type(`function`)(result)) {
    console.log(`intercept: result not yet ready`)
    return [ log_argument_pack, result ]
  } else {
    console.log(`intercept: result ready:`, result)
    return [ passalong, result ]
  }
}

function passalong (result) {
  console.log(`intercept: passalong: passing along result:`, result)
  return [ passalong, result ]
}

// const [ next, result ] = intercept(log_argument_pack)(a => b => {
//   return a * b
// })(1, 2, 3)(4, 5, 6)
// console.log(next(result))
// console.log(next(result))
// console.log(next(result))
// console.log(next(result))

// const log_it     = value => [ forward_it, ᐅlog(value) ]
// const forward_it = value => [     log_it,   value + 1 ]
// console.log(times(10)(apply(call))([ log_it, 0 ]))

/*
 * Okay, now we want to intercept expressions of the form:
 *
 *    fn(a) && fn(b) && ...
 *
 * where fn(a) returns its original, unintercepted value; yet, the fn(b)
 * interceptor is determined by the fn(a) interceptor.
 *
 * We need to take the 1st return value of a functional iterator -- the
 * next iterator -- and store it in an outside piece of shared state.
 *
 */

function invisible_iterator (next) {
  return bind({ next })(function invisible (value) {
    const [ next, new_value ] = this.next(value)
    this.next = next
    return new_value
  })
}

function increment (value) {
  console.log('increment is magic!')
  return [ increment, value + 1 ]
}

// const invisible_incrementer = invisible_iterator(increment)
// console.log(times(10)(invisible_incrementer)(0))

function intercept_methods (message_receiver_iterator) {
  const state = Symbol(`interceptor state`)
  return object => ᐅ([
    map_properties(([ key, descriptor ]) => {
      const intercepted = ᐅ([
        update(`value`)(function intercept_method (method) {
          return function intercepted_method (...argument_pack) {
            const result = method.apply(this, this[state].intercept({
              type    : 'arguments',
              payload : argument_pack,
              context : method,
            }))
            if (reflex.type.function(result)) {
              return bind(this)(intercept_method(result))
            } else {
              return this[state].intercept({
                type    : 'result',
                payload : result,
                context : method,
              })
            }
          }
        }),
        fallible.unwrap,
      ])(descriptor)
      return [ key, intercepted ]
    }),
    set.descriptor.mut(state)({
      value: {
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

const t = {
  '===': a => b => a === b,
  '!!' : a => !!a,
  '*': (a, b = 1) => (c, d = 1) => a * b * c * d,
  mkeq() { return this['==='] },
}

const intercept_log1 = message => [ intercept_log2, ᐅlog(message) ]
const intercept_log2 = message => [ intercept_log3, ᐅlog(message) ]
const intercept_log3 = message => [ intercept_log1, ᐅlog(message) ]
const new_t = intercept_methods(intercept_log1)(t)

console.log(new_t['==='](1)(2) || new_t['==='](3)(3))
console.dir(get.all.properties(new_t), { depth: null })
console.log(new_t['!!'](true))
console.dir(get.all.properties(new_t), { depth: null })
console.log(new_t['!!'](5))
console.dir(get.all.properties(new_t), { depth: null })
console.log(new_t['*'](2)(2))
console.log(new_t['*'](2, 3)(2, 2))
console.log(new_t.mkeq()(1, 2)(3, 4))
