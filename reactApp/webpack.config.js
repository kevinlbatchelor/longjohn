const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const BASE_HOST = process.env.BASE_HOST || 'http://localhost:3000';
const webpack = require('webpack');

module.exports = {
    entry: './src/index.jsx',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, '../app/public'),
        clean: true
    },
    resolve: {
        extensions: ['.js', '.jsx']      // allow imports without extension
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: 'babel-loader'
            }
        ]
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, '../app/public/index.html'),
                    to: 'index.html'
                }
            ]
        }),
        new webpack.DefinePlugin({
            BASE_HOST: JSON.stringify(BASE_HOST)
        }),
    ],
    devServer: {
        static: path.resolve(__dirname, '../app/public'),
        port: 3033,
        hot: true,
        open: true
    }
};
