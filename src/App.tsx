import * as React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import HomeScreen from './screens/HomeScreen';
import { DevicesDrawerContent } from './components/DevicesDrawerContent';
import { PaperProvider } from 'react-native-paper';
import AddDeviceDialog from './components/AddDeviceDialog';
import ChatScreen from './screens/ChatScreen';
import ChatChannelDrawerItem from './components/ChatChannelDrawerItem';
import { AppState, AppStateStatus, Platform } from 'react-native';

import { allChatChannelsDetailsData, loadAllChannelDetailsFromStorage } from './ChatData';
import SettingsScreen from './screens/SettingsScreen';
import Toast, { ErrorToast } from 'react-native-toast-message';
import { attemptToSendQueuedMessages, loadPersistentNetworkData } from './networking/ChatNetworking';
import { allPendingPeerConnections, loadPersistentData as loadPersistentP2PData } from './networking/P2PNetworking';
import { launchForegroundService } from './foreground-service';
import { registerEventHandler } from './util/Events';
import { EventData_channelId, Events } from './events';
import PendingChatChannelDrawerItem from './components/PendingChatChannelDrawerItem';
import { toString } from './networking/DeviceIdentifier';

const Drawer = createDrawerNavigator();
export const AppLevelActions = React.createContext({} as {
  deleteChatConnection: (address: string) => void,
  clearChatHistory: (address: string) => void
});

const toastConfig = {
  error: (props: any) => (
    <ErrorToast
      {...props}
      text1Style={{ whiteSpace: 'normal' }}
    />
  ),
};

//Navigators override the title of the window. The only way I could find to resolve this was to call this frequently.
export function updateWindowTitle() {
  if (Platform.OS == 'web') {
    new Promise(() => {
      document.title = 'P2P Messaging App';
    });
  }
}

export let forceRerenderApp: () => void;
export default function App() {
  try {
    const [dialogVisible_addDevice, setDialogVisible_addDevice] = React.useState(false);
    const [toggleToUpdate, setToggleToUpdate] = React.useState(false);

    const REATTEMPT_MSG_SEND_INTERVAL_MS = 500;
    React.useEffect(() => {
      loadAllChannelDetailsFromStorage().then(() => {
        forceRerenderApp();
      });
      loadPersistentNetworkData();
      loadPersistentP2PData();

      setInterval(attemptToSendQueuedMessages, REATTEMPT_MSG_SEND_INTERVAL_MS);
    }, []);

    React.useEffect(() => {
      registerEventHandler(Events.onPeerConnectionEstablished, 'app', (e: EventData_channelId) => {
        forceRerenderApp();
      });
    });

    const isMobile = Platform.OS == 'android' || Platform.OS == 'ios';
    if (isMobile) {
      React.useEffect(() => {
        const listener = AppState.addEventListener('change', handleAppStateChange);

        launchForegroundService();

        return () => {
          listener.remove();
        };
      }, []);
    }

    if (Platform.OS == 'web') {
      React.useEffect(() => {
        const rootChild = document.getElementById('root')!.firstElementChild! as HTMLElement;
        rootChild.style.height = 'inherit';

        updateWindowTitle();
      });
    }

    forceRerenderApp = function () {
      setToggleToUpdate(!toggleToUpdate);
    };

    function handleAppStateChange(newState: AppStateStatus) {
      if (newState == 'active') {
        launchForegroundService();
      }
    }

    let drawerItemKeyIndex = 0;

    let screenNames: string[] = [];
    function validateScreenName(name: string) {
      let sampleName = name;
      let index = 2;
      while (screenNames.includes(sampleName)) {
        sampleName = `${name}-#${index++}`;
      }
      screenNames.push(sampleName);
      return sampleName;
    }
    return (
      <React.Fragment>
        <PaperProvider>
          {Platform.OS === 'web' ? (
            <style type="text/css">{`
        @font-face {
          font-family: 'MaterialCommunityIcons';
          src: url(${require('react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf')}) format('truetype');
        }
      `}</style>
          ) : null}
          <NavigationContainer onStateChange={() => updateWindowTitle()}>
            <Drawer.Navigator drawerContent={(props) => <DevicesDrawerContent {...props} setDialogVisible_addDevice={setDialogVisible_addDevice} />} initialRouteName="Settings">
              <Drawer.Screen name="Home" component={HomeScreen} key={drawerItemKeyIndex++} />
              <Drawer.Screen name="Settings" component={SettingsScreen} key={drawerItemKeyIndex++} />
              {allChatChannelsDetailsData.map((data, index) => {
                console.log('Render drawer item', data, index);
                console.dir(data);
                return <Drawer.Screen
                  name={validateScreenName(data.name)}
                  key={drawerItemKeyIndex++}
                  component={ChatScreen}
                  initialParams={{ channelId: data.id }}
                  options={{
                    drawerLabel: () => <ChatChannelDrawerItem label={data.name} channelId={data.id} connected={true} />,
                    drawerLabelStyle: {},
                  }}
                />;
              })}
              {allPendingPeerConnections.map(pendingConnection => {
                const name = toString(pendingConnection.deviceId);
                return <Drawer.Screen
                  name={validateScreenName(name)}
                  key={drawerItemKeyIndex++}
                  component={ChatScreen}
                  initialParams={{ channelId: pendingConnection.deviceId }}
                  options={{
                    drawerLabel: () => <PendingChatChannelDrawerItem label={name} peerId={pendingConnection.deviceId} isOutbound={pendingConnection.isOutbound} />,
                  }} />;
              })}
            </Drawer.Navigator>
          </NavigationContainer>
          <AddDeviceDialog visible={dialogVisible_addDevice} setVisible={setDialogVisible_addDevice} />
        </PaperProvider>
        <Toast config={toastConfig} />
      </React.Fragment>
    );
  } catch (e) {
    console.error('Error caught by THE RIZZLER')
    throw e
  }
}
