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
