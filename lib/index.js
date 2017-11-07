// μtil
const create   = props => Object.create(null, props)
    , def_prop = prop => desc => obj => Object.defineProperty(obj, prop, desc) && obj

const flip  = f => a => b => f(b)(a)

const id = v => v

const each   = f => arr => (arr.forEach(f), arr)
    , map    = f => arr => arr.map(f)
    , filter = f => arr => arr.filter(f)
    , concat = a => b => a.concat(b)
    , cons   = it => flip(concat)([ it ])

const fold    = f => init => arr => arr.reduce((acc, v) => f(acc)(v), init)
    , apply   = (f, ctx=f) => args => fold(a => b => a(b))(f)(args)
    , ᐅᶠ      = fns => init => fold(v => f => f(v))(init)(fns)
    , all     = f => arr => arr.every(f)
    , get     = prop => obj => obj[prop]
    , len     = arr => arr.length
    , n_of    = x => n => (new Array(n)).fill(x)
    , til     = ᐅᶠ([ n_of(0), each((_, i, arr) => arr[i] = i) ])
    , inter   = as => bs => ᐅᶠ([ len, til, map(i => [ get(i)(as), get(i)(bs) ]) ])(as)
    , delace  = fold(arr => ([ a, b ]) => [ cons(a)(arr[0]), cons(b)(arr[1]) ])([[], []])
    , incl    = it => arr => arr.includes(it)
    , flatten = fold(a => b => concat(a)(b))([])
    , flatmap = f => arr => flatten(map(f)(arr))

const carry   = f => i => [ i, f(i) ]
    , cont    = f => ([ i, ...vs ]) => [ i, f(i), ...vs ]
    , uncarry = apply

const symbol_names = Object.getOwnPropertySymbols
    , own_props    = ᐅᶠ([ Object.getOwnPropertyDescriptors, Object.entries ])
    , get_desc     = prop => obj => Object.getOwnPropertyDescriptor(obj, prop)
    , own_symbols  = ᐅᶠ([ carry(symbol_names), uncarry(obj => map(carry(flip(get_desc)(obj)))) ])
    , own_defs     = o => concat(own_props(o))(own_symbols(o))

const simple = v => v === null || incl(typeof v)([ 'number', 'string', 'boolean', 'undefined' ])

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

/*
 * Sisyphus
 *
 * Maintaining passing tests is a lot like rolling a boulder up a hill
 *
 */
const log = console.log.bind(console)
function suite (description, fn, stream = log) {
  stream(`suite: ${description}`)
  const assertions = fn({ ok, eq, refeq })
  return map((assertion, index) => {
    const result = assertion()
    stream(`  ${index+1}/${assertions.length}:\t${result}\t${assertion}`)
    return result
  })(assertions)
}

const results = suite(`things are as they appear`, t => [
  _ => t.ok(true),
  _ => !t.ok(false),
  _ => t.eq(5)(5),
  _ => t.eq(some_obj)(some_obj),
  _ => !t.eq({ get a () { return 7 } })({ get a () { return 7 } }),
  _ => t.refeq(5)(5),
])
const passing = filter(ok)(results)
console.log(`${(100 * passing.length / results.length).toFixed(2)}% passing`)
