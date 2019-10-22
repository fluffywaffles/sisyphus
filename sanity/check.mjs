import { all, map, each, ᐅlog, flatten } from '@prettybad/util'
import sisyphus, { verisimilitude } from '../lib/index'

const { ok, eq, refeq } = verisimilitude

// Sanity checks: silence == sanity
const some_obj = { a: 5 }
    , get_set  = { get a () { return 5 }, set a (v) { /* side-effect */ } }
    , f = function () {}

{
  console.log(`\n>> begin asserts\n`)
  const start_time = process.hrtime()
  each((assert, i) => {
    const start_time = process.hrtime()
    const result = assert()
    const [ s, ns ] = process.hrtime(start_time)
    console.log(`${s}s ${ns/1e6}ms`, `\t${result ? '✓' : '✗'}\t`, assert.toString())
    if (result !== true) {
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
  const [ s, ns ] = process.hrtime(start_time)
  console.log(`${s}s ${ns/1e6}ms`, `\tasserts total`)
}

{
  const reporter = message => [ reporter, ᐅlog(message) ]

  const suite = sisyphus({ reporter })

  function time_t (test) {
    return t => {
      const start_time = process.hrtime()
      const result = test(t)
      const [ s, ns ] = process.hrtime(start_time)
      console.log(`${s}s ${ns/1e6}ms`, `\t${result ? '✓' : '✗'}\t`, test.toString())
      return result
    }
  }

  console.log(`\n>> begin suite\n`)
  const start_time = process.hrtime()
  const results = suite(`things are as they appear`, map(time_t)([
    // t => t.ok(true),
    // t => !t.ok(false),
    // t => t.eq(5)(5),
    // t => t.eq(some_obj)(some_obj),
    // t => !t.eq({ get a () { return 7 } })({ get a () { return 7 } }),
    // t => t.refeq(5)(5),
    t => t.eq({ a: 5, b: 3 })({ b: 3, a: 5 }),
    t => t.suite(`subsuite`, map(time_t)([
      t => t.eq(1)(1),
      t => t.eq({ a: 5 })({ a: 5 }) && t.eq({ b: 2 })({ b: 2 }),
    ])),
  ]))
  const [ s, ns ] = process.hrtime(start_time)
  console.log(`${s}s ${ns/1e6}ms`, `\tsuite total`)

  all(v => v === true)(flatten(results)) || (_ => { throw new Error(`test failure`) })()
}
