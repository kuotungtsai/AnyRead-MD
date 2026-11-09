const { resolve } = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const FriendlyErrors = require('@nuxt/friendly-errors-webpack-plugin')
const SveltePreprocess = require('svelte-preprocess')
const fs = require('fs')

// mermaid@9 imports a cytoscape file that newer cytoscape no longer exports
const pnpmDir = resolve(__dirname, '../node_modules/.pnpm')
const cytoscapeDir = fs.existsSync(pnpmDir)
  ? fs.readdirSync(pnpmDir).find(d => /^cytoscape@/.test(d))
  : null

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
          options: {
            preprocess: SveltePreprocess.typescript(),
          },
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
    alias: {
      '@': resolve(__dirname, '../src'),
      ...(cytoscapeDir && {
        'cytoscape/dist/cytoscape.umd.js$': resolve(
          pnpmDir,
          cytoscapeDir,
          'node_modules/cytoscape/dist/cytoscape.umd.js',
        ),
      }),
    },
  },
  stats: 'errors-only',
  plugins: [
    new FriendlyErrors(),
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: 'css/[name].css',
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
