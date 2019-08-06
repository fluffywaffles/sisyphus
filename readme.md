# Sisyphus
is a testing framework. Code, test, fail, repeat. Like rolling a boulder up a hill.

Test suites...
- Are arrays of assertions
- Can be written in your modules
- Don't have a crazy DSL
- Run in browsers
- Output wherever you want, and look pretty (devtools console, for starters)
- Support high-level browser automation (for integration testing)

Tests...
- Are written with eq and refeq
- That's it
- Seriously
- What did you want

Also...
- Don't write tests for your types (write types for your types)
- Don't write tests for your tests (write tests for your code)
- Never write a test instead of an assertion (make guarantees!)

## Proof of Concept: Invisible Method Interceptors

See `lib/proof-of-concept.mjs`.

Run it. Observe magic.

```
$ npm run --silent build -- lib/proof-of-concept.mjs | node
```
