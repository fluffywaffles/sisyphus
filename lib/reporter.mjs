import {
  ᐅ,
  ᐅlog,
  ᐅwhen,
  ᐅeffect,
  is,
  and,
  get,
} from '@prettybad/util'

const noop = message => [ noop, message ]

const debug = message => [ debug,
  ᐅeffect(ᐅ([
    get.values([ 'description', 'payload' ]),
    ᐅlog,
  ])),
]

const simple = message => [ simple,
  ᐅ([
    ᐅwhen(and([
      ᐅ([ get('prefix'), is('sisyphus:suite') ]),
      ᐅ([ get('type')  , is('prerun')         ]),
    ]))(({ payload: { length, description } }) => {
      console.group(`${description} (${length} tests)`)
    }),
    ᐅwhen(and([
      ᐅ([ get('prefix'), is('sisyphus:test') ]),
      ᐅ([ get('type')  , is('result')        ]),
    ]))(({ payload: { test, index, length, result, description } }) => {
      const icon = is(true)(result) ? `✓` : `✗`
      console.log(`${icon} ${description || test.toString()}`)
    }),
    ᐅwhen(and([
      ᐅ([ get('prefix'), is('sisyphus:suite') ]),
      ᐅ([ get('type')  , is('result')         ]),
    ]))(({ /* ... */ }) => {
      console.groupEnd()
    }),
  ])(message),
]

export {
  noop,
  debug,
  simple,
}
