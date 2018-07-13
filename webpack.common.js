const path  = require('path')
const fs    = require('fs')
const webpack = require('webpack')

let nodeModules = fs.readdirSync('./node_modules')
    .filter((module) => {
        return module !== '.bin';
    })
    .reduce((prev, module) => {
        return Object.assign(prev, {[module]: 'commonjs ' + module});
    }, {})

module.exports = {
    entry: {
        app: './application.js'
    },
    output: {
        path: path.resolve(__dirname, './webpack-build'),
        filename: '[name].bundle.js'
    },
    module: {
        rules: [
            { test: /\.jsx$/, loader: 'babel-loader', exclude: /node_modules/ },
            { test: /\.js$/, loader: 'babel-loader', exclude: /node_modules/ },
        ]
    },
    target: 'web',
    node: {
        /* http://webpack.github.io/docs/configuration.html#node */
        __dirname: false,
        __filename: false
    },
    watchOptions: {
        poll: 1000
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                'NODE_ENV': JSON.stringify(process.env.NODE_ENV),
                'API_URL': JSON.stringify(process.env.API_URL)
            }
        }),
    ]
}