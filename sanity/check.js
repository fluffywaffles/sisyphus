import { each } from '../lib/μtil'
import suite, { ok, eq, refeq } from '../lib/index'

// Sanity checks: silence == sanity
const some_obj = { a: 5 }
    , get_set  = { get a () { return 5 }, set a (v) { /* side-effect */ } }
each((assert, i) => {
  if (!assert()) console.error('failure!', i, assert)
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
  // NOTE: NaN isn't NaN so I am going to pretend NaN does not exist lalalala la la la
  //_ => eq(NaN)(NaN),
  _ => !eq([ 1, 2, 3 ])([ 1, 2, 4 ]),
  _ => !eq({ a: 5 })({ b: 5 }),
  _ => eq([ 1, 2, 3 ])([ 1, 2, 3 ]),
  _ => eq({ a: 5 })({ a: 5 }),
  _ => eq({ a: { b: 5 }  })({ a: { b: 5 } }),
  _ => !eq({ a: 5  })({ get a() { return 5 }}),
  // getters and setters must be refeq to be eq
  _ => eq(get_set)(get_set),
  _ => !eq(get_set)({ get a () { return 5 }, set a (v) { /* side-effect */ } }),
  _ => !eq([ { a: { set b (v) { } } } ])([ { a: { get b ( ) { } } } ]),
])

const results = suite(`things are as they appear`, t => [
  t => t.ok(true),
  t => !t.ok(false),
  t => t.eq(5)(5),
  t => t.eq(some_obj)(some_obj),
  t => !t.eq({ get a () { return 7 } })({ get a () { return 7 } }),
  t => t.refeq(5)(5),
])
