import resolve from 'rollup-plugin-node-resolve'

function mkbuild ({ input }) {
  return {
    input,
    output: {
      name: `sisyphus`,
      format: `umd`,
      sourcemap: `inline`,
    },
    plugins: [ resolve() ],
  }
}

export default mkbuild({ input: process.argv[0] })
