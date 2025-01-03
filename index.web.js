/**
 * @format
 */
import './gesture-handler';
import { AppRegistry } from 'react-native';
import App from './src/App';
import appConfig from './app.json';

const appName = appConfig.name;

AppRegistry.registerComponent(appName, () => App);
AppRegistry.runApplication(appName, {
    initialProps: {},
    rootTag: document.getElementById('root'),
});