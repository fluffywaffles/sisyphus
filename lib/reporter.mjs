import {
  ᐅ,
  ᐅif,
  ᐅlog,
  ᐅwhen,
  ᐅeffect,
  is,
  all,
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
  const info = +description !== +index ? description : test.toString()
  console.log(`${icon} ${info}`)
}
const simple = create_iterator({
  process (message) {
    return ᐅ([
      ᐅwhen(ᐅ([ get('type'), is('suite:prerun') ]))(simple_suite_prerun),
      ᐅwhen(ᐅ([ get('type'), is('test:result')  ]))(simple_test_result),
      ᐅwhen(ᐅ([ get('type'), is('suite:result') ]))(simple_suite_result),
    ])(message)
  },
})

export {
  noop,
  debug,
  simple,
}
