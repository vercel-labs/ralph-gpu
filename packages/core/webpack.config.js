const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

// Shared minification options using SWC
const swcMinifyOptions = {
  compress: {
    unused: true,
    dead_code: true,
    drop_debugger: true,
    drop_console: false, // Keep console for debug mode
    passes: 3,
    pure_getters: true,
    conditionals: true,
    comparisons: true,
    evaluate: true,
    booleans: true,
    loops: true,
    if_return: true,
    join_vars: true,
    collapse_vars: true,
    reduce_vars: true,
    negate_iife: true,
  },
  mangle: {
    toplevel: false, // Keep for UMD compatibility
    keep_classnames: false,
    keep_fnames: false,
  },
  format: {
    comments: false,
  },
};

// Base config shared between UMD and ESM
const baseConfig = {
  entry: './src/index.ts',
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
  optimization: {
    minimize: true,
    usedExports: true,
    sideEffects: true,
    concatenateModules: true,
    providedExports: true,
    innerGraph: true,
  },
  externals: {},
  performance: {
    hints: 'warning',
    maxAssetSize: 50000,
    maxEntrypointSize: 50000,
  },
};

// UMD build config (CommonJS + Browser)
const umdConfig = {
  ...baseConfig,
  name: 'umd',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    library: {
      name: 'RalphGPU',
      type: 'umd',
    },
    globalObject: 'typeof self !== "undefined" ? self : this',
    clean: false,
  },
  optimization: {
    ...baseConfig.optimization,
    minimizer: [
      new TerserPlugin({
        minify: TerserPlugin.swcMinify,
        terserOptions: swcMinifyOptions,
        extractComments: false,
      }),
    ],
  },
};

// ESM build config
const esmConfig = {
  ...baseConfig,
  name: 'esm',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.mjs',
    library: {
      type: 'module',
    },
    clean: false,
  },
  experiments: {
    outputModule: true,
  },
  optimization: {
    ...baseConfig.optimization,
    minimizer: [
      new TerserPlugin({
        minify: TerserPlugin.swcMinify,
        terserOptions: {
          ...swcMinifyOptions,
          module: true, // Important: tells SWC this is ESM
          mangle: {
            ...swcMinifyOptions.mangle,
            toplevel: true, // More aggressive for ESM
          },
        },
        extractComments: false,
      }),
    ],
  },
};

module.exports = [umdConfig, esmConfig];
