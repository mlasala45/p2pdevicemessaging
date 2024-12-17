import * as React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import HomeScreen from './src/screens/HomeScreen'
import { DevicesDrawerContent } from './src/components/DevicesDrawerContent'
import { PaperProvider } from 'react-native-paper';
import AddDeviceDialog from './src/components/AddDeviceDialog';
import { io as ClientSocket } from 'socket.io-client';
import { ToastAndroid } from 'react-native';
import ChatScreen from './src/screens/ChatScreen';

const Drawer = createDrawerNavigator();

export default function App() {
  const [dialogVisible_addDevice, setDialogVisible_addDevice] = React.useState(false)
  const [allDeviceConnections, setAllDeviceConnections] = React.useState(["phony"] as string[])
  const [toggleToUpdate, setToggleToUpdate] = React.useState(false)
  
  function forceUpdate() {
    setToggleToUpdate(!toggleToUpdate);
  }

  function sendConnectionRequest(address: string) {
    const client = ClientSocket(address, {
      autoConnect: false
    });

    client.on("connect", () => {
      const engine = client.io.engine;
      ToastAndroid.show(`Connected to ${address}.`, ToastAndroid.SHORT);
      allDeviceConnections.push(address)
      //TODO: Force Update?
      forceUpdate();
    })

    client.io.on("error", (error) => {
      ToastAndroid.show(error.toString(), ToastAndroid.LONG)
    });

    client.on("message", (message) => {
      ToastAndroid.show(`\n(Server): ${message}`, ToastAndroid.LONG)
    })

    client.connect();
  }

  return (
    <PaperProvider>
      <NavigationContainer>
        <Drawer.Navigator drawerContent={(props) => <DevicesDrawerContent {...props} setDialogVisible_addDevice={setDialogVisible_addDevice} allDeviceConnections={allDeviceConnections} />} initialRouteName="Home">
          <Drawer.Screen name="Home" component={HomeScreen} />
          {allDeviceConnections.map((address, index) => {
            return <Drawer.Screen name={address} key={address}component={ChatScreen} initialParams={{ connection: address }}/>
          })}
        </Drawer.Navigator>
      </NavigationContainer>
      <AddDeviceDialog visible={dialogVisible_addDevice} setVisible={setDialogVisible_addDevice} onSubmit={sendConnectionRequest} />
    </PaperProvider>
  );
}