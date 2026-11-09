const { resolve } = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const FriendlyErrors = require('@nuxt/friendly-errors-webpack-plugin')
const { optimize } = require('webpack')
const ThirdPartyNoticesPlugin = require('./third-party-notices.js')

module.exports = {
  entry: {
    content: resolve(__dirname, '../src/main.ts'),
    background: resolve(__dirname, '../src/background.ts'),
    popup: resolve(__dirname, '../src/popup/index.ts'),
    options: resolve(__dirname, '../src/options/index.ts'),
    'dir-frame': resolve(__dirname, '../src/dir-frame.ts'),
  },
  output: {
    filename: 'js/[name].js',
    path: resolve(__dirname, '../extension'),
    publicPath: './',
  },
  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        use: {
          loader: 'esbuild-loader',
          options: { loader: 'ts', target: 'esnext' },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.svelte$/,
        use: {
          loader: 'svelte-loader',
          // Svelte 5 strips `lang="ts"` type annotations itself
          options: { compilerOptions: { css: 'injected' } },
        },
      },
      {
        test: /\.(css|less)$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              esModule: false,
              // KaTeX's CSS lists woff2, woff and ttf for each font: bundle
              // only woff2 (Chrome stops at the first format it can load)
              url: {
                filter: url => !/KaTeX_[\w-]+\.(woff|ttf)$/.test(url),
              },
            },
          },
          'less-loader',
        ],
      },
      {
        test: /\.svg$/,
        use: 'svg-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.woff2$/,
        type: 'asset/resource',
        generator: {
          outputPath: 'fonts',
          publicPath: 'chrome-extension://__MSG_@@extension_id__/fonts/',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.svelte', '.json', '.less'],
    // Svelte 5 needs the `svelte` / `browser` conditions to pick its client runtime
    conditionNames: ['svelte', 'browser', '...'],
    alias: {
      '@': resolve(__dirname, '../src'),
    },
  },
  stats: 'errors-only',
  plugins: [
    // mermaid loads each diagram type with import(): keep everything inside
    // the entry bundles, since a content script cannot load extra chunks
    new optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
    new FriendlyErrors(),
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: 'css/[name].css',
    }),
    new ThirdPartyNoticesPlugin({
      header:
        'AnyRead MD is released under the MIT License (see LICENSE).\n' +
        'It is a fork of md-reader 2.x, Copyright (c) 2018-present Bener (MIT).\n',
      // pulled in by a Less @import, which webpack does not track as a module
      packages: ['@md-reader/theme'],
      supplements: require('./notices-supplements.js'),
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: resolve(__dirname, '../src/manifest.json'),
        },
        {
          from: resolve(__dirname, '../src/_locales'),
          to: '_locales',
        },
        {
          from: resolve(__dirname, '../src/images'),
          to: 'images',
        },
        {
          from: resolve(__dirname, '../src/popup/index.html'),
          to: 'popup.html',
        },
        {
          from: resolve(__dirname, '../src/options/index.html'),
          to: 'options.html',
        },
        {
          // MIT license must travel with every copy of the extension
          from: resolve(__dirname, '../LICENSE'),
          to: 'LICENSE',
          toType: 'file',
        },
      ],
    }),
  ],
}
