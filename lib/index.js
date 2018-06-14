import {
  ᐅᶠ,
  all,
  get,
  len,
  map,
  keys,
  push,
  sort,
  apply,
  mixin,
  concat,
  extend,
  reflex,
  string,
  update,
  interlace,
  properties,
  disinterlace,
  map_properties,
} from '@prettybad/util'

/* TODO+FIXME(jordan): Sisyphus doesn't understand boxed types. For example, `new Boolean(0)`. To
 * Sisyphus, this is an empty object: `descs` returns `[]`. Sisyphus should understand that a
 * Boolean is a Boolean. In general, Sisyphus should understand something about prototypes:
 * instanceof checks, at minimum, should be used where applicable during equality testing. There's
 * no (good) general algorithm for comparing prototype-holding objects, quite frankly. This is easy
 * to see: `Boolean.prototype.valueOf` is a good example. You can compare two Boolean objects'
 * valueOf methods, and they'll be equal, but `t.valueOf()` will be `true`, and `f.valueOf()` will
 * be `false`. There's no property of the Boolean object that expresses this distinction; it can
 * only be detected by running the respective `valueOf()` functions. The only workaround, and a poor
 * one at that, is to maintain a list of 'known unit methods' to compare the output of. We aren't
 * going to do this. This is the same as how a programmer could hide data from themselves by using
 * closure variables. There's no way to write a testing framework smart enough to outsmart the
 * programmer who outsmarts his/herself.
 *
 * What we can do, is compare the results of `Object.getPrototypeOf()`. We may end up adding a check
 * for `valueOf()`, simply because every inheritor of Object (in other words, most things that
 * aren't primitives and which have a prototype of some kind) defines `valueOf()`, and in particular
 * boxed types are comparable using `valueOf()`, which is how the JS runtime compares them. We can
 * at least do that. We don't want to traverse the prototype chain and aggregate every inherited
 * field and method in order to compare them, I don't think. That's a lot of work, and very little
 * ultimately stands to be gained. We're better off giving the test author access to instanceof
 * tests, and documenting explicitly what eq(...)(...) does and does not do.
 *
 * 1. test that Object.getPrototypeOf(a) === Object.getPrototypeOf(b)
 * ... except that we want to be able to t.eq({bare object})({ a: 5 }) and have it work. shit.
 */

/*
 * Verisimilitude
 *
 * Assertions from a time when things were simple still
 *
 */
// Works for things that don't need comparison
const ok = v => !!v
// Works for number, string, boolean, undefined, null, and object/array references
const refeq = a => b => a === b
// Works for deep comparisons of arrays/objects
const eq = a => b => {
  if (Number.isNaN(a) && Number.isNaN(b)) return true
  if (refeq(a)(b) || simple(a) || simple(b)) return refeq(a)(b)
  const [ a_keys, a_descs ] = disinterlace(sort(pairs_by_0)(properties(a)))
      , [ b_keys, b_descs ] = disinterlace(sort(pairs_by_0)(properties(b)))
  if (len(a_keys) !== len(b_keys)) return false
  const key_pairs  = interlace(a_keys)(b_keys)
      , desc_pairs = interlace(a_descs)(b_descs)
  return all_pairs(eq)(key_pairs) && all_pairs(descriptor_eq)(desc_pairs)
}

const simple = value => value === null || !reflex.type(`object`)(value)
const pairs_by_0 = ([ a0 ], [ b0 ]) => string(a0) < string(b0) ? -1 : 1
const all_pairs = f => all(apply(f))

const descriptor_permissions = [ `writable`, `enumerable`, `configurable` ]
const descriptor_content_keys = [ `get`, `set`, `value` ]
const descriptor_keys = concat(descriptor_permissions)(descriptor_content_keys)
const all_keys_eq = keys => a => b => all(k => eq(get(k)(a))(get(k)(b)))(keys)
const descriptor_eq = all_keys_eq(descriptor_keys)

const verisimilitude = { ok, eq, refeq }

/*
 * Sisyphus
 *
 * Maintaining passing tests is a lot like rolling a boulder up a hill
 *
 */
function sisyphus (stream = noop, t = verisimilitude) {
  return make_suite(streaming_values(t, stream), stream)
}

function streaming_values (t, stream) {
  return map_properties(([ name, descriptor ]) => {
    const arity = determine_curry_arity(descriptor.value)
    const interject_stream = interject_arity[arity](stream)
    return [ name, update(`value`)(interject_stream)(descriptor) ]
  })(t)
}

function interject_arity1 (xf) {
  return f => arg => {
    xf({ type: 'value', value: arg })
    return f(arg)
  }
}

function interject_arity2 (xf) {
  const interjector = interject_arity1(xf)
  return f => arg => {
    return interjector(interjector(f)(arg))
  }
}

const interject_arity = [
  _ => { throw new Error(`there is no arity 0`) },
  interject_arity1,
  interject_arity2,
]

// NOTE(jordan): statically determinable in a reasonable environment but this is JS
// FIXME(jordan): this is a horrendous hack and it just shouldn't work
function determine_curry_arity (f, arity=1) {
  const intermediate = f()
  if (typeof intermediate === 'function') {
    return determine_curry_arity(intermediate, arity + 1)
  } else {
    return arity
  }
}

function make_suite (base_t, stream) {
  return function suite (description, assertions) {
    const tests  = Object.entries(assertions)
        , length = tests.length
        , t = mixin({ suite })(base_t)
    stream({ type: 'suite', description, length })
    return map(tester(t, stream))(tests)
  }
}

function tester (t, stream) {
  return function test ([ description, assertion ], index, tests) {
    const name   = assertion.name || '<anonymous>'
        , length = tests.length
    stream({ type: 'test:prerun', index, description, name, assertion, length })
    const result = assertion(t)
    stream({ type: 'test:result', result, index, description, name, assertion, length })
    return result
  }
}

const log = (...args) => (console.dir(...args, { depth: null }), args)
const noop = function () {}

function processor ({
  value  = noop,
  prerun = noop,
  result = noop,
  suite  = noop,
}) {
  function and_then (fn) {
    return next => message => {
      fn(message)
      return next
    }
  }

  const value_or_result = message => {
    switch (message.type) {
      case 'value'       : return and_then(value)(value_or_result)(message)
      case 'test:result' : return and_then(result)(value_or_result)(message)
    }
  }

  return and_then(suite)(and_then(prerun)(value_or_result))
}

export function make_aggregator (process) {
  return function aggregate (values) {
    return function (message) {
      const next = make_aggregator(process(mixin(message)({ values })))
      switch (message.type) {
        case 'suite'       : /* fallthrough */
        // case 'test:result' : /* fallthrough */
        case 'test:prerun' : return next(values)
        case 'value'       : return next(push(message.value)(values))
        case 'test:result' : return next([])
      }
    }
  }
}

const summarizer = processor({
  result ({ result, values, index, description, name, assertion, length }) {
    if (result === false) {
      console.log(`✗ ${+description !== +index ? description : assertion.toString()}`)
      console.group()
      console.group(`Expected`)
      // TODO(jordan): split up expected/actual values for multiple assertions
      // and report correct failure (which should just be last 2 -- test:result will get called
      // twice, once for 1st 2 and once for 2nd 2).
      const ordered = reverse(values)
      console.dir(ordered[0], { depth: null })
      console.groupEnd()
      console.group(`Actual`)
      console.dir(ordered[1], { depth: null })
      console.groupEnd()
      console.groupEnd()
    } else if (!(result instanceof Array)) {
      console.log(`✓ ${+description !== +index ? description : assertion.toString()}`)
    }
    if (index === length - 1) {
      console.groupEnd()
    }
  },
  suite ({ description, length }) {
    console.group(`${description}`)
  },
})

// REFACTOR(jordan): This isn't how the aggregator is called by the test runner
// The primary issue, naturally, is that interject (as usual) doesn't do what we might expect
// Can we write a process function that always calls the next processor regardless of whether things
// are passed along correctly?
function stateful_processor (process) {
  const state_process = { suite: process }
  // TODO(jordan)
  return message => {
    switch (message.type) {
      case 'suite':
        state_process.prerun = state_process.suite(message)
        break
      case 'test:prerun':
        state_process.value_or_result = state_process.prerun(message)
        break
      case 'test:result':
        state_process.value_or_result(message)
        break
      case 'value':
        state_process.value_or_result = state_process.value_or_result(message)
        break
    }
  }
}

export const streaming_summary = stateful_processor(summarizer)
export const stateful = stateful_processor(make_aggregator(summarizer)([]))
// stateful({ type: 'suite', description: 'do' })
// stateful({ type: 'test:prerun' })
// stateful({ type: 'value', value: 1 })
// stateful({ type: 'value', value: 2 })
// stateful({ type: 'test:result', index: 0, length: 1, assertion: t => !t.eq(1)(2), result: true })

// NOTE(jordan): this code works, but since the runner doesn't call it this way it doesn't work when
// we try to actually use it as the streaming function.
// make_aggregator(summarizer)([])
//   ({ type: 'suite', description: 'do' })
//   ({ type: 'test:prerun' })
//   ({ type: 'value', value: 1 })
//   ({ type: 'value', value: 2 })
//   ({ type: 'test:result', index: 0, length: 1, assertion: t => !t.eq(1)(2), result: true })

export { verisimilitude, sisyphus, summarizer }
export default sisyphus
