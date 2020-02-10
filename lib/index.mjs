import {
  ᐅ,
  ᐅdo,
  ᐅeffect,
  is,
  all,
  and,
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

import * as intercept from './interceptor.mjs'
import * as reporters from './reporter.mjs'

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
function Harness ({
  reporter   : base_reporter   = reporters.noop,
  assertions : base_assertions = verisimilitude,
}) {
  /* NOTE(jordan): configuration like { profile: true } might one day
   * exist, which would cause the sisyphus constructor to wrap the
   * base_reporter with reporter-composers for e.g. time-profiling
   * assertions and suites.
   */
  const reporter = base_reporter
  /* NOTE(jordan): context encapsulates all of the state maintained by
   * an instance of the sisyphus test-harness: the suite function, the
   * test runner, any configuration, the intercepted set of messaging
   * assertions, the current reporter iterator... so on.
   */
  const Context = ({ depth, suite, tests }) => ᐅeffect(ᐅ([
    ᐅdo([ Assertions.create, set.value.mut(`assertions`) ]),
    ᐅdo([ TestRunner.create, set.value.mut(`run_test`)   ]),
  ]))({
    depth,
    tests,
    reporter,
    base_assertions,
    next_reporter ([ next_reporter ]) { this.reporter = next_reporter },
    suite (description, definition) {
      return suite(description, definition, { depth: depth + 1 })
    },
  })
  /* NOTE(jordan): `suite` is how sets of tests are described and grouped.
   * A `suite` is purely organizational; it's functionally equivalent to
   * an `and` over all of its tests.
   */
  function suite (
    description,
    definition,
    {
      depth   = 1,
      tests   = enumerable_entries(definition),
      context = Context({ depth, suite, tests }),
    } = {},
  ) {
    const length = len(context.tests)
    const is_subsuite = depth > 1
    context.next_reporter(context.reporter(intercept.Message({
      prefix  : `sisyphus:suite`,
      type    : `prerun`,
      payload : { depth, length, description, is_subsuite },
      sender  : context.suite,
    })))
    const result = map_indexed(context.run_test)(context.tests)
    context.next_reporter(context.reporter(intercept.Message({
      prefix  : `sisyphus:suite`,
      type    : `result`,
      payload : { depth, length, result, description, is_subsuite },
      sender  : context.suite,
    })))
    return result
  }
  /* NOTE(jordan): and that's it. All the magic that will happen, has
   * happened. Just return the suite builder and call it on a set of test
   * definitions, and you'll be all harnessed-up and ready to rip.
   */
  return { suite }
}

const Assertions = {
  create ({ suite, reporter, base_assertions }) {
    return ᐅ([
      /* NOTE(jordan): add `suite` to the base set of assertions to enable
       * defining subsuites on the test-harness object, `t`.
       */
      set.values({ suite }),
      ᐅdo([ keys, methods => intercept.methods(methods)(reporter) ]),
    ])(base_assertions)
  },
}

/* NOTE(jordan): `run_test` evaluates a single assertion, sending
 * messages to the interceptor as it goes. The test-runner is also
 * responsible for passing the reporter down into the intercepted
 * assertions, so that assertions will continue the reporter from the
 * state where it left off, and then reponsible for restoring the
 * reporter after the test is run, so that the following messages will
 * be able to operate on accumulated state from the assertions
 * themselves. This is how arguments to `eq` are captured, aggregated,
 * and available to the `test:result` message, for example.
 */
const TestRunner = {
  create (context) {
    return function run_test (index) {
      return ([ description, test ]) => {
        // Get the length of the current suite from our context
        const length = len(context.tests)
        // Unset description in the case of an array element
        if (+description === +index) {
          description = undefined
        }
        const name = test.name || `<anonymous>`
        context.next_reporter(context.reporter(intercept.Message({
          prefix  : `sisyphus:test`,
          type    : `prerun`,
          payload : { name, test, index, length, description },
          sender  : context.run_test,
        })))
        intercept.set_receiver(context.reporter)(context.assertions)
        const result = test(context.assertions)
        context.next_reporter(intercept.release(context.assertions))
        const last_message = intercept.last_message(context.assertions)
        if (
          !and([
            ᐅ([ get(`type`), is(`result`) ]),
            ᐅ([ get(`sender`), is(context.suite) ]),
          ])(last_message)
        ) {
          context.next_reporter(context.reporter(intercept.Message({
            prefix  : `sisyphus:test`,
            type    : `result`,
            payload : { name, test, index, length, description, result },
            sender  : context.run_test,
          })))
        }
        return result
      }
    }
  }
}

export { Harness, reporters, verisimilitude }
export default Harness
