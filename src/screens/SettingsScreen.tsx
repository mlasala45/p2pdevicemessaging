import React, { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  Platform,
  TextStyle,
  StyleProp
} from 'react-native';

import {
  Text,
  ActivityIndicator,
  Button,
  Dialog,
  Icon,
  IconButton,
  Portal,
  TextInput,
} from 'react-native-paper'

import { connectToSignalingServer, currentSignalServerUsername, SocketStatus, updateSignalServerUsername } from '../networking/P2PNetworking';
import storage from '../Storage';
import { deleteAllChannels as deleteAllChatChannels } from '../ChatData';
import Toast from 'react-native-toast-message';

type SectionProps = PropsWithChildren<{
  title: string;
}>;

const Colors = {
  white: 'white',
  black: 'black',
  light: 'white',
  dark: 'gray',
  darker: 'gray',
  lighter: 'white'
}

interface ConnectionStatusMessage {
  message: string,
  color: string
}

function SettingsScreen(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const [signalServerAddress, setSignalServerAddress] = useState('')
  const [username, setUsername] = useState('')
  const [signalConnectionStatus, setSignalConnectionStatus] = useState(SocketStatus.Disconnected)
  const [connectionStatusMessage, setConnectionStatusMessage] = useState({} as ConnectionStatusMessage)

  const [dialogOpen_deleteAll, setDialogOpen_deleteAll] = useState(false)

  useEffect(() => {
    storage.load({
      key: 'signalServerAddress'
    }).then(data => {
      if (typeof data != 'string') data = ''
      setSignalServerAddress(data)
    })

    storage.load({
      key: 'username'
    }).then(data => {
      if (typeof data != 'string') data = ''
      if (data == '') data = crypto.randomUUID().substring(0, 8);
      setUsername(data)
    })
  }, [])

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    padding: 5
  };

  function onClick_reconnectToSignalServer() {
    connectToSignalingServer(signalServerAddress, username, onSignalSocketStatusChanged)
  }

  function onClick_updateUsername() {
    updateSignalServerUsername(username)
  }

  function onChangeInput_signalServerAddress(text: string) {
    text = text.replace(/[^a-zA-Z0-9:/.]/g, '');
    setSignalServerAddress(text)
    storage.save({
      key: 'signalServerAddress',
      data: text
    })
  }

  function onChangeInput_username(text: string) {
    text = text.replace(/[^a-zA-Z0-9_-]/g, ''); //Allow only alphanumeric, underscore, and dash
    setUsername(text)
    storage.save({
      key: 'username',
      data: text
    })
  }

  function onSignalSocketStatusChanged(status: SocketStatus) {
    setSignalConnectionStatus(status)
    switch (status) {
      case SocketStatus.Connected:
        setConnectionStatusMessage({
          message: `Connected as '${currentSignalServerUsername}'`,
          color: 'green'
        })
        break;
      case SocketStatus.Connecting:
        setConnectionStatusMessage({
          message: `Connecting`,
          color: 'yellow'
        })
        break;
      case SocketStatus.ConnectionError:
        setConnectionStatusMessage({
          message: `Connection Error`,
          color: 'red'
        })
        break;
      case SocketStatus.Disconnected:
        setConnectionStatusMessage({
          message: `Not Connected`,
          color: 'red'
        })
        break;
    }
  }

  function hideDialog_deleteAll() {
    setDialogOpen_deleteAll(false)
  }

  function confirmDialog_deleteAll() {
    hideDialog_deleteAll()
    deleteAllChatChannels().then(() => {
      Toast.show({
        type: 'success',
        text1: `Deleted all connections`,
        visibilityTime: 2000
      })
    })
  }

  let connectionStatusIcon
  if (signalConnectionStatus == SocketStatus.Connecting) {
    connectionStatusIcon = <ActivityIndicator />
  }
  else if (signalConnectionStatus == SocketStatus.ConnectionError) {
    connectionStatusIcon = <Icon
      source="alert-circle-outline"
      size={20}
      color='red'
    />
  }
  else {
    connectionStatusIcon = <Icon
      source='connection'
      color={signalConnectionStatus == SocketStatus.Connected ? 'green' : 'red'}
      size={20}
    />
  }

  let usernameStatus;
  if (signalConnectionStatus == SocketStatus.Connected) {
    if (username == currentSignalServerUsername) {
      usernameStatus = <IconButton
        icon="check"
        size={20}
        iconColor='green'
        style={{ margin: 0 }}
      />
    }
    else {
      usernameStatus = <IconButton
        icon="update"
        size={20}
        iconColor='red'
        style={{ margin: 0 }}
        onPress={onClick_updateUsername}
      />
    }
  }
  else {
    usernameStatus = null
  }

  const alertColor = 'red';
  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <View
          style={{
            backgroundColor: isDarkMode ? undefined : Colors.white,
          }}>
          <Text style={styles.header}>Signal Server</Text>
          <Text style={styles.label}>Network Address</Text>
          <View style={styles.row}>
            <TextInput
              value={signalServerAddress}
              onChangeText={onChangeInput_signalServerAddress}
              dense
              style={{ maxWidth: 300, marginRight: 5, flexGrow: 1, marginTop: 3 }}
              placeholder='eg. http://192.168.1.139:3000'
            />
            {connectionStatusIcon}

            <IconButton
              icon="replay"
              size={20}
              iconColor='black'
              style={{ margin: 0 }}
              onPress={onClick_reconnectToSignalServer}
            />
          </View>
          {connectionStatusMessage.message &&
            <Text style={{ color: connectionStatusMessage.color }}>
              {connectionStatusMessage.message}
            </Text>
          }
          <Text style={styles.label}>Username</Text>
          <View style={styles.row}>
            <TextInput
              value={username}
              onChangeText={onChangeInput_username}
              dense
              style={{ maxWidth: 200 }}
            />
            {usernameStatus}
          </View>
          <Text style={styles.sublabel}>This is only relevant if multiple devices on your local network are using the same, external signal server.</Text>
          <Text style={{ ...styles.header, marginBottom: 10 }}>Advanced</Text>
          <Button
            mode='contained'
            onPress={() => { setDialogOpen_deleteAll(true) }}
            style={{
              backgroundColor: alertColor,
              maxWidth: 200
            }}
            labelStyle={{
              color: 'white'
            }}
          >Delete all Connections</Button>
        </View>
      </ScrollView>
      <Portal>
        <Dialog visible={dialogOpen_deleteAll} onDismiss={hideDialog_deleteAll}>
          <Dialog.Title style={{ color: alertColor }}>Delete all Connections?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{`Are you sure? Your chat histories will be lost (your peers will keep their copies). This action cannot be undone.`}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDialog_deleteAll}>Cancel</Button>
            <Button onPress={confirmDialog_deleteAll}>Confirm</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    flexDirection: 'column',
  },
  highlight: {
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  header: {
    fontWeight: '600',
    fontSize: 20,
    marginBottom: 5
  },
  label: {
    fontWeight: '600',
    fontSize: 16,
  },
  sublabel: {
    fontStyle: 'italic',
    fontSize: 16,
    marginBottom: 3,
    maxWidth: 500,
  },
  connectionStatusText: {
  },
});

export default SettingsScreen;
