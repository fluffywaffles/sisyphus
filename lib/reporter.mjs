import {
  ᐅ,
  ᐅif,
  ᐅlog,
  ᐅwhen,
  ᐅeffect,
  is,
  all,
  and,
  get,
  set,
  reflex,
} from '@prettybad/util'

function create_iterator ({
  next    = _       => create_iterator({ next, process }),
  process = message => message,
}) {
  return message => [ next(message), process(message) ]
}

const noop = create_iterator({})

const debug = create_iterator({
  process: ᐅeffect(ᐅ([ get.values([ 'description', 'payload' ]), ᐅlog ]))
})

function simple_suite_prerun ({
  payload: {
    length,
    description,
  },
}) {
  console.group(`${description} (${length} tests)`)
}
function simple_suite_result ({
  payload: {
    length,
    result,
    description,
  },
}) {
  console.groupEnd()
}
function simple_test_result ({
  payload: {
    test,
    index,
    length,
    result,
    description,
  },
}) {
  const icon = is(true)(result) ? `✓` : `✗`
  console.log(`${icon} ${description || test.toString()}`)
}
const simple = create_iterator({
  process (message) {
    return ᐅ([
      ᐅwhen(and([
        ᐅ([ get('prefix'), is('sisyphus:suite') ]),
        ᐅ([ get('type')  , is('prerun')         ]),
      ]))(simple_suite_prerun),
      ᐅwhen(and([
        ᐅ([ get('prefix'), is('sisyphus:test') ]),
        ᐅ([ get('type')  , is('result')        ]),
      ]))(simple_test_result),
      ᐅwhen(and([
        ᐅ([ get('prefix'), is('sisyphus:suite') ]),
        ᐅ([ get('type')  , is('result')         ]),
      ]))(simple_suite_result),
    ])(message)
  },
})

export {
  noop,
  debug,
  simple,
}
