import {
  all,
  apply,
  inter,
  map,
  get,
  delace,
  own_defs,
  simple,
  mixin,
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
  if (refeq(a)(b) || simple(a) || simple(b)) return refeq(a)(b)
  const [ a_names, a_descs ] = delace(own_defs(a))
      , [ b_names, b_descs ] = delace(own_defs(b))
  const name_pairs = inter(a_names)(b_names)
      , desc_pairs = inter(a_descs)(b_descs)
  return all_pairs(eq)(name_pairs) && all_pairs(same_desc)(desc_pairs)
}

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
function sisyphus (t = verisimilitude, stream = log) {
  return make_suite(t, stream)
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
    const result = assertion(t).valueOf()
        , name   = assertion.name || '<anonymous>'
        , length = tests.length
    return stream({ type: 'test', index, result, description, name, assertion, length })
  }
}

const log = (...args) => (console.log(...args), args)

export { verisimilitude, sisyphus }
export default sisyphus
