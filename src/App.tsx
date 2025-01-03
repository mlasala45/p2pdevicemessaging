import * as React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import HomeScreen from './screens/HomeScreen'
import { DevicesDrawerContent } from './components/DevicesDrawerContent'
import { PaperProvider } from 'react-native-paper';
import AddDeviceDialog from './components/AddDeviceDialog';
import ChatScreen from './screens/ChatScreen';
import ChatChannelDrawerItem from './components/ChatChannelDrawerItem';
import { Platform } from 'react-native';

import { allChatChannelsDetailsData, deleteChatChannel, loadAllChannelDetailsFromStorage } from './ChatData';
import SettingsScreen from './screens/SettingsScreen';
import Toast, { ErrorToast } from 'react-native-toast-message';
import { attemptToSendQueuedMessages, loadPersistentNetworkData } from './networking/ChatNetworking';
import { launchForegroundService } from './foreground-service';

const Drawer = createDrawerNavigator();
export const AppLevelActions = React.createContext({} as {
  deleteChatConnection: (address: string) => void,
  clearChatHistory: (address: string) => void
})

const toastConfig = {
  error: (props: any) => (
    <ErrorToast
      {...props}
      text1Style={{ whiteSpace: 'normal' }}
    />
  )
}

//Navigators override the title of the window. The only way I could find to resolve this was to call this frequently.
export function updateWindowTitle() {
  if (Platform.OS == 'web') {
    new Promise(() => {
      // @ts-ignore
      document.title = "P2P Messaging App"
    })
  }
}

export let forceRerenderApp: () => void
export default function App() {
  const [dialogVisible_addDevice, setDialogVisible_addDevice] = React.useState(false)
  const [toggleToUpdate, setToggleToUpdate] = React.useState(false)

  const REATTEMPT_MSG_SEND_INTERVAL_MS = 500
  React.useEffect(() => {
    loadAllChannelDetailsFromStorage().then(forceRerenderApp)
    loadPersistentNetworkData()

    setInterval(attemptToSendQueuedMessages, REATTEMPT_MSG_SEND_INTERVAL_MS)

    if (Platform.OS == 'android') {
      launchForegroundService()
    }
  }, [])

  if (Platform.OS == "web") {
    React.useEffect(() => {
      // @ts-ignore
      const rootChild = document.getElementById('root').firstElementChild
      rootChild.style.height = 'inherit'

      updateWindowTitle()
    })
  }

  forceRerenderApp = function () {
    setToggleToUpdate(!toggleToUpdate);
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
            <Drawer.Screen name="Home" component={HomeScreen} />
            {allChatChannelsDetailsData.map((data, index) => {
              console.log("Render drawer item", data, index)
              console.dir(data)
              return <Drawer.Screen
                name={data.name}
                key={index}
                component={ChatScreen}
                initialParams={{ channelId: data.id }}
                options={{
                  drawerLabel: () => <ChatChannelDrawerItem label={data.name} channelId={data.id} connected={true} />,
                  drawerLabelStyle: {}
                }}
              />
            })}
            <Drawer.Screen name="Settings" component={SettingsScreen} />
          </Drawer.Navigator>
        </NavigationContainer>
        <AddDeviceDialog visible={dialogVisible_addDevice} setVisible={setDialogVisible_addDevice} />
      </PaperProvider>
      <Toast config={toastConfig} />
    </React.Fragment>
  );
}