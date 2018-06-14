import resolve from 'rollup-plugin-node-resolve'

const input = process.env.input

export default {
  input,
  output: {
    name: `sisyphus`,
    format: `umd`,
  },
  plugins: [
    resolve(),
  ],
}
