// μ U+03bc
// μtil
const create   = props => Object.create(null, props)
    , def_prop = prop => desc => obj => Object.defineProperty(obj, prop, desc) && obj

const flip = f => a => b => f(b)(a)

const id = v => v

const each   = f => arr => (arr.forEach(f), arr)
    , map    = f => arr => arr.map(f)
    , filter = f => arr => arr.filter(f)
    , concat = a => b => a.concat(b)
    , cons   = it => flip(concat)([ it ])

const fold    = f => init => arr => arr.reduce((acc, v) => f(acc)(v), init)
    , apply   = (f, ctx=f) => args => fold(a => b => a(b))(f)(args)
    // ᐅᶠ U+1405 U+1da0
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

const _mixin = obj => ([ p, d ]) => def_prop(p)(d)(obj)
    , mixin  = a => b => fold(_mixin)(create())(concat(own_defs(a))(own_defs(b)))

const simple = v => v === null || incl(typeof v)([ 'number', 'string', 'boolean', 'undefined' ])

export {
  create,
  def_prop,
  flip,
  id,
  each,
  map,
  filter,
  concat,
  cons,
  fold,
  apply,
  ᐅᶠ,
  all,
  get,
  len,
  n_of,
  til,
  inter,
  delace,
  incl,
  flatten,
  flatmap,
  carry,
  cont,
  uncarry,
  symbol_names,
  own_props,
  get_desc,
  own_symbols,
  own_defs,
  mixin,
  simple,
}
