const path = require('path');

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'index.ts'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'test-bundle.js',
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.js'],
    // Stub out Node.js built-ins so sharp/detect-libc don't break the browser bundle
    fallback: {
      fs: false,
      path: false,
      os: false,
      crypto: false,
      stream: false,
      util: false,
      events: false,
      child_process: false,
      worker_threads: false,
    },
  },
  externals: {
    // Externalize sharp and related Node-only packages
    sharp: 'commonjs sharp',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
              },
              target: 'es2022',
            },
          },
        },
      },
    ],
  },
};
