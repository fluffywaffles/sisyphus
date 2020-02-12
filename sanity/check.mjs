import {
  ᐅ,
  ᐅwhen,
  ᐅeffect,
  is,
  all,
  any,
  get,
  set,
  map,
  not,
  each,
  time,
  reflex,
  flatten,
} from '@prettybad/util'

import sisyphus, { verisimilitude, reporters } from '../lib/index.mjs'


// Sanity checks
const some_obj = { a: 5 }
    , get_set  = { get a () { return 5 }, set a (v) { /* side-effect */ } }
    , f = function () {}

{
  const { ok, eq, refeq } = verisimilitude
  console.log(`\n>> begin asserts\n`)
  const profile = time(() => {
    each((assert, i) => {
      const profile = time(assert)
      console.log(
        profile.summarize({ resolution: 'us' }),
        `\t${profile.value ? '✓' : '✗'}\t`,
        assert.toString(),
      )
      if (not(is(true))(profile.value)) {
        console.error('failure!', i, assert)
      }
    })([
      _ => ok(true),
      _ => !ok(false),
      _ => refeq(some_obj)(some_obj),
      _ => !refeq(some_obj)({ a: 5 }),
      _ => eq(some_obj)(some_obj),
      _ => eq(some_obj)({ a: 5 }),
      _ => eq('a')('a'),
      _ => eq(false)(false),
      _ => eq(true)(true),
      _ => eq(5)(5),
      _ => eq(Infinity)(Infinity),
      _ => eq(-Infinity)(-Infinity),
      _ => !eq(Infinity)(-Infinity),
      _ => eq()(),
      _ => eq(undefined)(undefined),
      _ => eq(null)(null),
      _ => eq({})({}),
      _ => eq([])([]),
      _ => eq([{},{}])([{},{}]),
      _ => eq([[[]]])([[[]]]),
      _ => eq(f)(f),
      _ => !eq(function () {})(function () {}),
      _ => eq(NaN)(NaN),
      _ => !eq([ 1, 2, 3 ])([ 1, 2, 4 ]),
      _ => !eq([ [ 1 ], 2, 3 ])([ [ 2 ], 2, 3 ]),
      _ => !eq({ a: 5 })({ b: 5 }),
      _ => eq([ 1, 2, 3 ])([ 1, 2, 3 ]),
      _ => eq({ a: 5 })({ a: 5 }),
      _ => eq({ a: { b: 5 }  })({ a: { b: 5 } }),
      _ => !eq({ a: 5  })({ get a() { return 5 }}),
      // getters and setters must be refeq to be eq
      _ => eq(get_set)(get_set),
      _ => !eq({ get a () {  } })({ get a () {  } }),
      _ => !eq(get_set)({ get a () { return 5 }, set a (v) { /* side-effect */ } }),
      _ => !eq([ { a: { set b (v) {} } } ])([ { a: { get b () {} } } ]),
      _ => eq({ a: 5, b: 3 })({ b: 3, a: 5 }),
    ])
  })
  console.log(profile.summarize({ resolution: 'us' }), `\ttotal`)
  console.log(`\n<< end asserts`)
}

{
  const harness = sisyphus({ reporter: reporters.simple })
  console.log(`\n>> begin suite\n`)
  const profile = time(() => harness.suite(`things are as they appear`, [
    t => t.ok(true),
    t => !t.ok(false),
    t => t.eq(5)(5),
    t => t.eq(some_obj)(some_obj),
    t => !t.eq({ get a () { return 7 } })({ get a () { return 7 } }),
    t => t.refeq(5)(5),
    t => t.eq({ a: 5, b: 3 })({ b: 3, a: 5 }),
    t => t.suite(`subsuite`, [
      t => t.eq(1)(1),
      t => t.eq({ a: 5 })({ a: 5 }) && t.eq({ b: 2 })({ b: 2 }),
    ]),
    t => t.suite(`shorthand subsuite`, {
      'sub-sub-suite a': [ t => t.ok(true) ],
      'sub-sub-suite b': [ t => t.ok(true) ],
    }),
  ]))
  console.log(profile.summarize({ resolution: 'us' }), `\tsuite`)

  const deep_flatten = messages =>
    ᐅwhen(any(reflex.instance.Array))(ᐅ([ flatten, deep_flatten ]))
  if (!all(is(true))(deep_flatten(profile.value))) {
    throw new Error(`test failure`)
  }
  console.log(`\n<< end suite`)
}
