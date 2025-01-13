/**
 * @format
 */
import './gesture-handler';
import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import { registerForegroundService } from './src/foreground-service'
import { clearRegisteredNotificationChannels, getNotifChannelId, registerNotificationChannels } from './src/util/Notifications';
import { headless_keepAlive } from './src/headless-keepAlive'
import { startup_connectToSignalingServer } from './src/networking/P2PNetworking';

clearRegisteredNotificationChannels()
registerNotificationChannels([
    { id: 'default', name: 'Default Notifications Channel' },
    { id: 'foregroundService', name: 'Foreground Service' }
])

export let foregroundServiceChannelId
getNotifChannelId('foregroundService').then(id => foregroundServiceChannelId = id)

registerForegroundService()

startup_connectToSignalingServer()

AppRegistry.registerComponent(appName, () => App);

/*AppRegistry.registerHeadlessTask('keepAlive', () =>
    headless_keepAlive
);*/