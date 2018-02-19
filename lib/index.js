import {
  all,
  get,
  map,
  obj,
  defs,
  each,
  fold,
  flip,
  push,
  sort,
  inter,
  apply,
  mixin,
  create,
  concat,
  delace,
  simple,
  reverse,
  def_prop,
  own_defs,
  own_props,
} from './mutil'

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
  const [ a_names, a_descs ] = delace(sort(defs_by_name)(own_defs(a)))
      , [ b_names, b_descs ] = delace(sort(defs_by_name)(own_defs(b)))
  const name_pairs = inter(a_names)(b_names)
      , desc_pairs = inter(a_descs)(b_descs)
  return all_pairs(eq)(name_pairs) && all_pairs(same_desc)(desc_pairs)
}

const defs_by_name = ([ a_name, _a ], [ b_name, _b ]) => a_name < b_name ? -1 : 1
const all_pairs = f => all(apply(f))
const eq_props = props => a => b => all(p => eq(a[p])(b[p]))(props)
const same_desc = eq_props([ 'writable', 'enumerable', 'configurable', 'get', 'set', 'value' ])

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
  const interjecter = interject(stream)
      , wrap_value  = desc => mixin(desc)({ value: interjecter(desc.value) })
  return defs(map(([ name, desc ]) => [ name, wrap_value(desc) ])(own_defs(t)))
}

const interject = xf => f => new Proxy(f, {
  apply (f, ths, args) {
    // each(xf)(map(value => obj({ type: 'value', value }))(args))
    xf({ type: 'value', value: args[0] })
    const intermediate = f.apply(ths, args)
    if (typeof intermediate === 'function') {
      return interject(xf)(intermediate)
    } else {
      return intermediate
    }
  }
})

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
    console.group()
    if (values != null) console.log(values)
    if (result === false) {
      console.log(assertion.toString())
      console.error(`Failure!`)
    } else if (!(result instanceof Array)) {
      console.log(`✓ ${assertion.toString()}`)
    }
    console.groupEnd()
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
