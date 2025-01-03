const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const imageInlineSizeLimit = parseInt(
    process.env.IMAGE_INLINE_SIZE_LIMIT || '10000'
);

const hasJsxRuntime = (() => {
    if (process.env.DISABLE_NEW_JSX_TRANSFORM === 'true') {
        return false;
    }

    try {
        require.resolve('react/jsx-runtime');
        return true;
    } catch (e) {
        return false;
    }
})();

const isEnvDevelopment = true
const publicUrl = process.env.PUBLIC_URL || '';

function resolveApp(pathIn) {
    return path.resolve(__dirname, pathIn)
}

const appIncludes = [
    resolveApp('src'),
    resolveApp('node_modules/react-native-vector-icons'),
    resolveApp('node_modules/react-native-webrtc-web-shim'),
    resolveApp('node_modules/react-native-tcp-socket'),
    resolveApp('node_modules/react-native-toast-message'),
    //resolveApp('node_modules/regenerator_runtime')
]

module.exports = {
    mode: 'development',
    entry: ['./index.web.js'],
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'bundle.js',
    },
    devtool: 'source-map',
    resolve: {
        alias: {
            'react-native$': 'react-native-web',
        },
        extensions: ['.web.js', '.web.ts', '.jsx', '.js', '.json', '.tsx', '.ts'],
        fallback: {
            "regenerator-runtime": require.resolve("regenerator-runtime/runtime")
        }
    },
    module: {
        strictExportPresence: false,
        rules: [
            {
                test: /\.(js|jsx|ts|tsx)$/,
                include: appIncludes,
                use: {
                    loader: 'babel-loader',
                    options: {
                        customize: require.resolve(
                            'babel-preset-react-app/webpack-overrides'
                        ),
                        presets: [
                            [
                                require.resolve('babel-preset-react-app'),
                                {
                                    runtime: hasJsxRuntime ? 'automatic' : 'classic',
                                },
                            ],
                            require.resolve("@babel/preset-env"),
                            require.resolve("@babel/preset-react")
                        ],
                        plugins: [
                            require.resolve('@babel/plugin-transform-runtime'),
                            require.resolve("@babel/plugin-transform-modules-commonjs")
                        ],
                        // @remove-on-eject-begin
                        babelrc: false,
                        configFile: false,
                    },
                },
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(ttf|otf|eot|svg|woff|woff2)$/,
                type: 'asset/resource',
            },
            {
                test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
                type: 'asset/resource',
                parser: {
                    dataUrlCondition: {
                        maxSize: imageInlineSizeLimit,
                    },
                },
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './public/index.html',
            templateParameters: {
                PUBLIC_URL: publicUrl,
            },
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'public'),
        },
        hot: true,
        port: 8082,
    },
};
