const path = require('path');

module.exports = {
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    library: {
      name: 'ralph-gpu',
      type: 'umd',
    },
    globalObject: 'this',
  },
  resolve: {
    extensions: ['.ts', '.js'],
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
  externals: {
    // Don't bundle any external dependencies
  },
};

// ESM build config
const esmConfig = {
  ...module.exports,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.mjs',
    library: {
      type: 'module',
    },
  },
  experiments: {
    outputModule: true,
  },
};

module.exports = [module.exports, esmConfig];
