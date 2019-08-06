import {
  id,
  ᐅ,
  ᐅif,
  ᐅeffect,
  all,
  get,
  len,
  map,
  keys,
  push,
  sort,
  apply,
  merge,
  concat,
  reflex,
  string,
  update,
  reverse,
  fallible,
  interlace,
  map_indexed,
  disinterlace,
  map_properties,
  enumerable_entries,
} from '@prettybad/util'

/* TODO+FIXME(jordan): Do recursive `eq` on prototypes.
 *
 * This will break tests that like to combare null-prototype objects to
 * object lierals (whose prototype is `Object`). The behavior of the tests
 * is wrong. Fix them. For example:
 *
 * ```
 * const bare = ᐅeffect(obj => Object.setPrototypeOf(obj, null))
 * // ...
 * t.eq(Object.create(null, { a: { value: 5 } }))
 *     ({ a: 5 })
 * ->
 * t.eq(Object.create(null, { a: { value: 5 } }))
 *     (bare({ a: 5 }))
 * ```
 *
 * There. Fixed.
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
  const sorted_properties = ᐅ([ get.all.properties, sort(pairs_by_0) ])
  const [ a_keys, a_descs ] = disinterlace(sorted_properties(a))
      , [ b_keys, b_descs ] = disinterlace(sorted_properties(b))
  if (len(a_keys) !== len(b_keys)) return false
  const key_pairs  = interlace(a_keys)(b_keys)
      , desc_pairs = interlace(a_descs)(b_descs)
  return all(apply(eq))(key_pairs) && all(descriptor_eq)(desc_pairs)
}

const simple = value => value == null || !reflex.type(`object`)(value)
const pairs_by_0 = ([ a0 ], [ b0 ]) => string(a0) < string(b0) ? -1 : 1

const descriptor_keys = [
  `get`,
  `set`,
  `value`,
  `writable`,
  `enumerable`,
  `configurable`,
]
const descriptor_eq = ᐅ([
  map(get.values(descriptor_keys)), // [ [ value, .... ], [ value, ... ] ]
  apply(interlace),                 // [ [ value, value ], ... ]
  all(apply(eq)),                   // eq(value)(value) && ...
])

const verisimilitude = { ok, eq, refeq }

/*
 * Sisyphus
 *
 * Maintaining passing tests is a lot like rolling a boulder up a hill
 *
 */
/* TODO(jordan):
 *
 * sisyphus ({ reporter = noop, assertions = verisimilitude }) { ... }
 */
function noop () {}
function sisyphus (reporter = noop, assertions = verisimilitude) {
  return make_suite(streaming_values(assertions, reporter), reporter)
}

function streaming_values (assertions, reporter) {
  const intercept = interceptor({
    argument : ᐅeffect(value => reporter({ type: `assertion:value`, value })),
    result   : ᐅeffect(value => reporter({ type: `assertion:result`, value })),
  })
  return map_properties(([ key, desc ]) => {
    return [ key, fallible.unwrap(update(`value`)(intercept)(desc)) ]
  })(assertions)
}

function intercept1 ({ before=id, after=id }) {
  return fn => ᐅ([ before, fn, after ])
}

function interceptor ({ argument=id, result=id }) {
  const is_function = reflex.type(`function`)
  return fn => intercept1({
    before: argument,
    after: ᐅif(is_function)(interceptor({ argument, result }))(result),
  })(fn)
}

function make_suite (base_assertions, reporter) {
  return function suite (description, test_definitions) {
    const tests      = enumerable_entries(test_definitions)
        , length     = len(tests)
        , assertions = merge({ suite })(base_assertions)
    reporter({ type: 'test:suite', description, length })
    return map_indexed(index => ([ description, test ]) => {
      const name   = test.name || '<anonymous>'
      reporter({ type: 'test:prerun', index, description, name, test, length })
      const result = test(assertions)
      reporter({ type: 'test:result', result, index, description, name, test, length })
      return result
    })(tests)
  }
}

function processor ({
  value  = noop,
  prerun = noop,
  result = noop,
  suite  = noop,
}) {
  function receive ({ receiver, next_receiver }) {
    return message => {
      receiver(message)
      return next_receiver
    }
  }

  const test_receiver = message => {
    const apply_receiver = receiver => {
      return receive({ receiver, next_receiver: test_receiver })(message)
    }
    switch (message.type) {
      case 'assertion:value'  : return apply_receiver(value)
      case 'assertion:result' : return apply_receiver(noop)
      case 'test:result'      : return apply_receiver(result)
    }
  }

  return receive({
    receiver      : suite,
    next_receiver : receive({
      receiver      : prerun,
      next_receiver : test_receiver,
    }),
  })
}

export function make_aggregator (process) {
  return function aggregate (values) {
    return function (message) {
      const next = make_aggregator(process(merge(message)({ values })))
      switch (message.type) {
        case 'test:suite'       : /* fallthrough */
        case 'test:result'      : /* fallthrough */
        case 'test:prerun'      : return next(values)
        case 'assertion:value'  : return next(push(message.value)(values))
        case 'assertion:result' : return next([])
      }
    }
  }
}

const summarizer = processor({
  result ({ result, values, index, description, name, test, length }) {
    if (result === false) {
      console.log(`✗ ${+description !== +index ? description : test.toString()}`)
      console.group()
      console.group(`The first provided value:`)
      // TODO(jordan): split up expected/actual values for multiple assertions
      // and report correct failure (which should just be last 2 -- test:result will get called
      // twice, once for 1st 2 and once for 2nd 2).
      const ordered = reverse(values)
      console.dir(ordered[0], { depth: null })
      console.groupEnd()
      console.group(`Is not the same as the second value:`)
      console.dir(ordered[1], { depth: null })
      console.groupEnd()
      console.groupEnd()
    } else if (!(result instanceof Array)) {
      console.log(`✓ ${+description !== +index ? description : test.toString()}`)
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
      case 'test:suite':
        state_process.prerun = state_process.suite(message)
        break
      case 'test:prerun':
        state_process.value_or_result = state_process.prerun(message)
        break
      case 'test:result':
        state_process.value_or_result(message)
        break
      case 'assertion:value':
        state_process.value_or_result = state_process.value_or_result(message)
        break
    }
  }
}

export const streaming_summary = stateful_processor(summarizer)
export const stateful = stateful_processor(make_aggregator(summarizer)([]))
// stateful({ type: 'test:suite', description: 'do' })
// stateful({ type: 'test:prerun' })
// stateful({ type: 'assertion:value', value: 1 })
// stateful({ type: 'assertion:value', value: 2 })
// stateful({ type: 'test:result', index: 0, length: 1, test: t => !t.eq(1)(2), result: true })

// NOTE(jordan): this code works, but since the runner doesn't call it this way it doesn't work when
// we try to actually use it as the streaming function.
// make_aggregator(summarizer)([])
//   ({ type: 'test:suite', description: 'do' })
//   ({ type: 'test:prerun' })
//   ({ type: 'assertion:value', value: 1 })
//   ({ type: 'assertion:value', value: 2 })
//   ({ type: 'test:result', index: 0, length: 1, test: t => !t.eq(1)(2), result: true })

export { verisimilitude, sisyphus, summarizer }
export default sisyphus
