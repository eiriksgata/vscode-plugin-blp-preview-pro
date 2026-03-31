/* eslint-disable @typescript-eslint/naming-convention */
//@ts-check

'use strict';

const path = require('path');
const fs = require('fs');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node',
  mode: 'none',
  entry: fs.readdirSync('./src/custom-editor')
    .filter((v) => !v.endsWith('.ts'))
    .reduce((ret, v) => {
      ret[`media/${v}`] = `./src/custom-editor/${v}/index.ts`;
      return ret;
    }, /** @type {Record<string, string>} */ ({
      'media/message': './src/custom-editor/message.ts',
      'dist/extension': './src/extension.ts',
    })),

  output: {
    path: __dirname,
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    hashFunction: 'xxhash64',
  },

  devtool: process.env.NODE_ENV === 'production' ? false : 'nosources-source-map',

  externals: {
    vscode: 'commonjs vscode',
  },

  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@common': path.resolve(__dirname, 'src/common/'),
      '@custom-editor': path.resolve(__dirname, 'src/custom-editor/'),
      '@command': path.resolve(__dirname, 'src/command/'),
      '@mpq': path.resolve(__dirname, 'src/mpq-manager/'),
      '@parser': path.resolve(__dirname, 'src/parser/'),
      '@tree-provider': path.resolve(__dirname, 'src/tree-provider/'),
      '@types': path.resolve(__dirname, 'src/types/'),
      '@bar-entry': path.resolve(__dirname, 'src/bar-entry/'),
    },
  },

  optimization: {
    minimize: process.env.NODE_ENV === 'production',
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: process.env.NODE_ENV === 'production',
            drop_debugger: process.env.NODE_ENV === 'production',
          },
        },
        extractComments: false,
      }),
    ],
    usedExports: true,
    sideEffects: false,
  },

  performance: {
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
  },

  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },

  plugins: [new MiniCssExtractPlugin()],

  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules|war3-model/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
            },
          },
        ],
      },
      {
        test: /\.html$/i,
        use: 'raw-loader',
      },
      {
        test: /\.less$/i,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              url: false,
              sourceMap: process.env.NODE_ENV !== 'production',
            },
          },
          {
            loader: 'less-loader',
            options: {
              sourceMap: process.env.NODE_ENV !== 'production',
            },
          },
        ],
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              url: false,
              sourceMap: process.env.NODE_ENV !== 'production',
            },
          },
        ],
      },
    ],
  },

  stats: {
    hash: false,
    modules: false,
    children: false,
    warnings: true,
    errors: true,
    performance: true,
  },
};

module.exports = config;
