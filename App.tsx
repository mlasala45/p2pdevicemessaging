import * as React from 'react';
import { IconButton } from 'react-native-paper';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import HomeScreen from './src/screens/HomeScreen'
import { DevicesDrawerContent } from './src/components/DevicesDrawerContent'
import { PaperProvider } from 'react-native-paper';
import AddDeviceDialog from './src/components/AddDeviceDialog';
import { io as ClientSocket } from 'socket.io-client';
import { ToastAndroid } from 'react-native';
import ChatScreen from './src/screens/ChatScreen';
import storage from './src/Storage'
import { connectToRemoteHost, MessageRawData } from './src/Networking';
import ChatChannelDrawerItem from './src/components/ChatChannelDrawerItem';

import { onMessageReceivedCallbacks } from './src/screens/ChatScreen';
import { allChatChannelsData, deleteChannel } from './src/ChatData';
import { isConnectedToRemoteHost, loadPersistentNetworkData, clearPendingMessagesToHost } from './src/Networking';

const Drawer = createDrawerNavigator();
export const AppLevelActions = React.createContext({} as {
  deleteChatConnection: (address: string) => void,
  clearChatHistory: (address: string) => void
})

export default function App() {
  const [dialogVisible_addDevice, setDialogVisible_addDevice] = React.useState(false)
  const [allDeviceConnections, setAllDeviceConnections] = React.useState([] as string[])
  const [toggleToUpdate, setToggleToUpdate] = React.useState(false)

  //On initial load, retrieve connections from persistent storage
  React.useEffect(() => {
    console.log("Loading data from storage")
    storage
      .load({
        key: 'connectionAddresses'
      }).then(data => {
        console.log("On data loaded")
        console.log(data)
        setAllDeviceConnections(data)
      }).catch(err => {
        switch (err.name) {
          case 'NotFoundError':
            storage.save({
              key: 'connectionAddresses',
              data: allDeviceConnections
            })
            break
          default:
            console.log("Error loading storage/connectionAddresses")
            console.warn(err.message)
            ToastAndroid.show(err.toString(), ToastAndroid.LONG)
        }
      })

      loadPersistentNetworkData()
  }, [])

  function forceUpdate() {
    setToggleToUpdate(!toggleToUpdate);
  }

  //TODO: Potential risk here from sendConnectionRequest working with outdated data and overwriting your connections. TODO make it operate on up-to-date data from persistent storage
  function sendConnectionRequest(address: string) {
    const client = connectToRemoteHost(address, {
      onConnect: () => {
        ToastAndroid.show(`App.tsx Connected to ${address}.`, ToastAndroid.SHORT);
        allDeviceConnections.push(address)
        //TODO: Force Update?
        forceUpdate();

        storage.save({
          key: 'connectionAddresses',
          data: allDeviceConnections
        })
      },
      onMessage: (data : MessageRawData) => {
        onMessageReceivedCallbacks[address](data)
        //ToastAndroid.show(`\n(Server): ${message}`, ToastAndroid.LONG)
      }
    })
  }

  function deleteChatConnection(address: string) {
    const newData = allDeviceConnections.filter(item => item != address)
    setAllDeviceConnections(newData)
    deleteChannel(address)
    storage.save({
      key: 'connectionAddresses',
      data: newData
    })
  }

  function clearChatHistory(address: string) {
    if (allChatChannelsData[address]) {
      allChatChannelsData[address].messages = []
      storage.save({
        key: 'chatChannelsData',
        id: address,
        data: allChatChannelsData[address]
      })
      clearPendingMessagesToHost(address)
    }
  }

  const appLevelActions = {
    deleteChatConnection,
    clearChatHistory
  }

  return (
    <AppLevelActions.Provider value={appLevelActions}>
      <PaperProvider>
        <NavigationContainer>
          <Drawer.Navigator drawerContent={(props) => <DevicesDrawerContent {...props} setDialogVisible_addDevice={setDialogVisible_addDevice} allDeviceConnections={allDeviceConnections} />} initialRouteName="Home">
            <Drawer.Screen name="Home" component={HomeScreen} />
            {allDeviceConnections.map((address, index) => {
              return <Drawer.Screen
                name={address}
                key={address}
                component={ChatScreen}
                initialParams={{ connection: address }}
                options={{
                  drawerLabel: () => <ChatChannelDrawerItem label={address} channelId={address} connected={isConnectedToRemoteHost(address)} />,
                  drawerLabelStyle: {}
                }}
              />
            })}
          </Drawer.Navigator>
        </NavigationContainer>
        <AddDeviceDialog visible={dialogVisible_addDevice} setVisible={setDialogVisible_addDevice} onSubmit={sendConnectionRequest} />
      </PaperProvider>
    </AppLevelActions.Provider>
  );
}