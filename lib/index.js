import {
  all,
  apply,
  inter,
  map,
  get,
  delace,
  own_defs,
  simple,
} from './μtil'

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
  const [ b_names, b_descs ] = delace(own_defs(b))
  return all_same(a_names)(b_names)
    && eq_conf(a_descs)(b_descs)
    && eq_vals(a_descs)(b_descs)
    && refeq_getsets(a_descs)(b_descs)
}
const all_same = as => bs => all(apply(refeq))(inter(as)(bs))
const same_props = props => a => b => all(p => refeq(a[p])(b[p]))(props)
    , same_conf  = same_props([ 'writable', 'enumerable', 'configurable' ])
const eq_conf = a_descs => b_descs => all(apply(same_conf))(inter(a_descs)(b_descs))
const eq_vals = a_descs => b_descs => all(apply(eq))(inter(vals(a_descs))(vals(b_descs)))
    , vals = map(get('value'))
const refeq_getsets = a_descs => b_descs => all(apply(same_getset))(inter(a_descs)(b_descs))
    , same_getset = same_props([ 'get', 'set' ])

/*
 * Sisyphus
 *
 * Maintaining passing tests is a lot like rolling a boulder up a hill
 *
 */
const log = console.log.bind(console)
function suite (description, fn, stream = log) {
  stream(`suite: ${description}`)
  const t = { ok, eq, refeq }
  const assertions = fn(t)
  return map((assertion, index) => {
    const result = assertion(t).valueOf()
    const name = assertion.name || '<anonymous>'
    stream(`  ${index+1}/${assertions.length}:\t${result}\t${name}\t${assertion}`)
    return result
  })(assertions)
}

export { ok, eq, refeq }
export default suite
