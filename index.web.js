/**
 * @format
 */
import './gesture-handler';
import { AppRegistry } from 'react-native';
import App from './src/App';
import appConfig from './app.json';
import { startup_connectToSignalingServer } from './src/networking/P2PNetworking';

startup_connectToSignalingServer()

const appName = appConfig.name;

AppRegistry.registerComponent(appName, () => App);
AppRegistry.runApplication(appName, {
    initialProps: {},
    rootTag: document.getElementById('root'),
});