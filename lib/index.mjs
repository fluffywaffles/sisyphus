import {
  ᐅ,
  all,
  get,
  set,
  len,
  map,
  keys,
  sort,
  apply,
  reflex,
  string,
  interlace,
  map_indexed,
  disinterlace,
  get_prototype,
  enumerable_entries,
} from '@prettybad/util'

import * as intercept from './method-interceptor.mjs'

/*
 * Verisimilitude
 *
 * Assertions from a time when things were simple still
 *
 */
// For things that don't need comparison
const ok = v => !!v
// For number, string, boolean, undefined, null, object/array references
const refeq = a => b => a === b
// For deep comparisons of arrays/objects
const eq = a => b => {
  if (Number.isNaN(a) && Number.isNaN(b))
    return true
  if ((a === b) || simple(a) || simple(b))
    return refeq(a)(b)
  const [ a_keys, a_descs ] = disinterlace(sorted_properties(a))
      , [ b_keys, b_descs ] = disinterlace(sorted_properties(b))
  if (len(a_keys) !== len(b_keys))
    return false
  const key_pairs  = interlace(a_keys)(b_keys)
      , desc_pairs = map(expand_desc_pair)(interlace(a_descs)(b_descs))
  const a_proto = get_prototype(a)
      , b_proto = get_prototype(b)
  return true
      && all(apply(eq))(key_pairs)
      && all(all(apply(eq)))(desc_pairs)
      && eq(a_proto)(b_proto)
}

const verisimilitude = { eq, ok, refeq }

const simple = value => value == null || !reflex.type.object(value)
const pairs_by_0 = ([ a0 ], [ b0 ]) => string(a0) < string(b0) ? -1 : 1
const sorted_properties = ᐅ([ get.all.properties, sort(pairs_by_0) ])

/* NOTE(jordan): in order to not recur infinitely we expand descriptor
 * objects into comparable pairs of values. Otherwise, we get the
 * properties for the descriptor objects, and then the properties for
 * their properties, and then the properties for _their_ properties, ...
 * we never stop!
 */
const descriptor_keys = [
  `get`,
  `set`,
  `value`,
  `writable`,
  `enumerable`,
  `configurable`,
]
const expand_desc_pair = descriptor_pair => ᐅ([
  // [ { value, writable, ... }, { value, writable, ... } ]
  map(get.values(descriptor_keys)),
  // → [ [ value, writable, .... ], [ value, writable, ... ] ]
  apply(interlace),
  // → [ [ value, value ], [ writable, writable ], ... ]
])(descriptor_pair)

/*
 * Sisyphus
 *
 * Maintaining passing tests is a lot like rolling a boulder up a hill
 *
 */
function sisyphus ({ reporter = noop, assertions = verisimilitude }) {
  const Context = ({ reporter, assertions }) => ({
    reporter,
    assertions: intercept.methods(keys(assertions))(reporter)(assertions),
    next_reporter ([ next_reporter ]) { this.reporter = next_reporter },
  })
  return function suite (description, test_definitions) {
    const tests  = enumerable_entries(test_definitions)
        , length = len(tests)
    const context = Context({
      reporter,
      assertions: set.values({ suite })(assertions),
    })
    context.next_reporter(context.reporter({
      type    : 'test:suite',
      payload : { length, description },
      sender  : suite,
    }))
    return map_indexed(test_runner({ context, length }))(tests)
  }
}

function test_runner ({ context, length }) {
  return function run_test (index) {
    return ([ description, test ]) => {
      const name = test.name || '<anonymous>'
      context.next_reporter(context.reporter({
        type    : 'test:prerun',
        payload : { name, test, index, length, description },
        sender  : run_test,
      }))
      intercept.set_receiver(context.reporter)(context.assertions)
      const result = test(context.assertions)
      context.next_reporter(intercept.release(context.assertions))
      context.next_reporter(context.reporter({
        type    : 'test:result',
        payload : { name, test, index, length, description, result },
        sender  : run_test,
      }))
      return result
    }
  }
}

export { verisimilitude, verisimilitude as asserts, sisyphus }
export default sisyphus
