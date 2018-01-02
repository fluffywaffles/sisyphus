// μ U+03bc
// ᐅᶠ U+1405 U+1da0
// μtil
const create   = props => Object.create(null, props)
    , def_prop = prop => desc => obj => Object.defineProperty(obj, prop, desc) && obj

const flip = f => a => b => f(b)(a)

const id = v => v

const each   = f => arr => ([].forEach.call(arr, f), arr)
    , map    = f => arr => [].map.call(arr, f)
    , filter = f => arr => [].filter.call(arr, f)
    , concat = a => b => [].concat.call(a, b)
    , cons   = it => flip(concat)([ it ])

const fold    = f => init => arr => [].reduce.call(arr, (acc, v) => f(acc)(v), init)
    , apply   = (f, ctx=f) => args => fold(a => b => a(b))(f)(args)
    , ᐅᶠ      = fns => init => fold(v => f => f(v))(init)(fns)
    , all     = f => arr => [].every.call(arr, f)
    , get     = prop => obj => obj[prop]
    , len     = arr => arr.length
    , n_of    = x => n => (new Array(n)).fill(x)
    , til     = ᐅᶠ([ n_of(0), each((_, i, arr) => arr[i] = i) ])
    , inter   = as => bs => ᐅᶠ([ len, til, map(i => [ get(i)(as), get(i)(bs) ]) ])(as)
    , delace  = fold(arr => ([ a, b ]) => [ cons(a)(arr[0]), cons(b)(arr[1]) ])([[], []])
    , incl    = it => arr => [].includes.call(arr, it)
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

const _mixin = obj => ([ p, d ]) => def_prop(p)(d)(obj)
    , defs   = dfs => fold(_mixin)(create())(dfs)
    , obj    = o => defs(own_defs(o))
    , mixin  = a => b => defs(concat(own_defs(a))(own_defs(b)))

const simple = v => v === null || incl(typeof v)([ 'function', 'number', 'string', 'boolean', 'undefined' ])

export {
  id,
  ᐅᶠ,
  map,
  all,
  get,
  len,
  til,
  obj,
  flip,
  each,
  incl,
  cons,
  n_of,
  cont,
  fold,
  apply,
  inter,
  carry,
  mixin,
  concat,
  filter,
  simple,
  delace,
  create,
  uncarry,
  flatmap,
  flatten,
  def_prop,
  get_desc,
  own_defs,
  own_props,
  own_symbols,
  symbol_names,
}
