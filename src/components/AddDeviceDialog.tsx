import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, PaperProvider, Text, TextInput, ActivityIndicator, Icon } from 'react-native-paper';
import { decodeToIpv4, isCodeValid } from '../util/ipaddrcode';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import { isConnectedToSignalServer, PublicNetworkAddress, sendConnectionRequest_signalServer } from '../networking/P2PNetworking';
import { NavigationContainer } from '@react-navigation/native';
import { updateWindowTitle } from '../App';

export let resetAddDeviceDialog: () => void

const styles = StyleSheet.create({
    dialogStep2Row: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%'
    }
})

const Tab = createMaterialTopTabNavigator();

function makecallback_onChangeText_AddressCode(addressCode: { value: string, set: (value: string) => void }) {
    return (text: string) => {
        text = text.replace(/[^a-zA-Z0-9-]/g, '');
        if (text.length == 3 && addressCode.value.length == 2) text = text + '-'
        if (text.length == 4 && text.charAt(3) != '-') text = text.slice(0, 3) + '-' + text.slice(3);
        if(text.charAt(text.length-1) == '-' && text.length != 4) text = text.slice(0,text.length-1)
        text = text.toUpperCase()
        text = text.slice(0, 8)
        addressCode.set(text)
    }
}

const Tab_ByAddress = () => {
    const context = React.useContext(Context_AddDeviceDialog)
    const [addressCode, setAddressCode] = [context.addressCode.value, context.addressCode.set];
    const [portStr, setPortStr] = React.useState("");

    const isValid = isCodeValid(addressCode)
    const ipv4Str_noport = decodeToIpv4(addressCode)
    const ipv4Str = isValid ? `${ipv4Str_noport}:${portStr || '???'}` : ''

    return (
        <View style={{ padding: 5 }}>
            <TextInput
                label="Public Address Code"
                value={addressCode}
                onChangeText={makecallback_onChangeText_AddressCode(context.addressCode)}
                style={{
                    marginBottom: 10
                }}
            />
            <TextInput
                label="Port"
                value={portStr}
                onChangeText={
                    text => {
                        if (text != '') {
                            const port = parseInt(text) || 0
                            text = Math.min(port, 65535).toString()
                        }
                        setPortStr(text)
                    }
                }
                keyboardType="number-pad"
                style={{
                    marginBottom: 10
                }}
            />
            <TextInput
                label="IPv4 Address"
                value={ipv4Str}
                disabled
            />
        </View>
    )
}

const Tab_BySignalServer = () => {
    const context = React.useContext(Context_AddDeviceDialog)
    const [addressCode, setAddressCode] = [context.addressCode.value, context.addressCode.set];
    const [username, setUsername] = [context.username.value, context.username.set];
    const currentRouteName = context.currentRouteName

    const ipv4Str_noport = decodeToIpv4(addressCode)

    return (
        <React.Fragment>
            <TextInput
                label="Public Address Code"
                value={addressCode}
                onChangeText={makecallback_onChangeText_AddressCode(context.addressCode)}
                style={{
                    marginBottom: 10
                }}
            />
            <TextInput
                label="Username (Optional)"
                value={username}
                onChangeText={
                    text => {
                        setUsername(text)
                    }
                }
                keyboardType="number-pad"
                style={{
                    marginBottom: 10
                }}
            />
            <TextInput
                label="IPv4 Address"
                value={ipv4Str_noport}
                disabled
            />
            {(currentRouteName == 'By Signal Server' && !isConnectedToSignalServer()) &&
                <Text style={{ color: 'red', marginTop: 5, alignSelf: 'flex-end' }}>Not connected to signal server</Text>
            }
        </React.Fragment>
    )
}

const Context_AddDeviceDialog: React.Context<any> = React.createContext({})

const AddDeviceDialog = ({ visible, setVisible }: AddDeviceDialogProps) => {
    const [addressCode, setAddressCode] = React.useState("");
    const [username, setUsername] = React.useState("");
    const [portStr, setPortStr] = React.useState("");
    const [channelName, setChannelName] = React.useState("");

    const [dialogStep, setDialogStep] = React.useState(0)
    const [connectionPending, setConnectionPending] = React.useState(false)
    const [currentRouteName, setCurrentRouteName] = React.useState('')

    const step1_navigationRef: any = React.useRef();

    const showDialog = () => setVisible(true);
    const hideDialog = () => setVisible(false);

    React.useEffect(() => {
        updateWindowTitle()
    })

    resetAddDeviceDialog = function () {
        setAddressCode('')
        setPortStr('')
    }

    const port = parseInt(portStr) || 0
    const isValid = isCodeValid(addressCode)
    const ipv4Str_noport = decodeToIpv4(addressCode)
    const ipv4Str = isValid ? `${ipv4Str_noport}:${portStr || '???'}` : ''

    //Functionality

    function abortConnectionRequest() {
        setDialogStep(0)
        setConnectionPending(false)

        //TODO
    }

    function onConnectionSuccessful() {
        setConnectionPending(false)
    }

    function onDismiss() {
        abortConnectionRequest()
        hideDialog()
    }

    //Dialog Steps
    //

    const sendButtonEnabled = (dialogStep == 0) && (
        (currentRouteName == 'By Address' && isValid && portStr != '') ||
        (currentRouteName == 'By Signal Server' && isValid && isConnectedToSignalServer())
    )
    function DialogActions_Step1() {
        return (<React.Fragment>
            <Button onPress={() => {
                hideDialog();
            }}>Cancel</Button>
            <Button onPress={onClick_Next} disabled={!sendButtonEnabled}>Send</Button>
        </React.Fragment>)
    }

    function onClick_Next() {
        if (dialogStep == 0) {
            //setDialogStep(dialogStep + 1)
            hideDialog()

            sendConnectionRequest_signalServer(ipv4Str_noport, username)

            //Send Connection Request
            setConnectionPending(true)
        }
    }

    //Step 2

    function DialogContent_Step2() {
        return (
            <View style={{ padding: 30 }}>
                <TextInput
                    label="Channel Name"
                    value={channelName}
                    onChangeText={
                        text => {
                            setChannelName(text)
                        }
                    }
                    style={{
                        marginBottom: 10
                    }}
                />
                <View style={styles.dialogStep2Row}>
                    <TextInput
                        label="Default Name"
                        value={ipv4Str_noport}
                        disabled
                        style={{ flex: 1, marginRight: 5 }}
                    />
                    <Button onPress={() => console.log("Press!")}>
                        <Icon source='content-copy' size={20} />
                        <Icon source='arrow-up' size={20} />
                    </Button>
                </View>
            </View>)
    }

    function DialogActions_Step2() {
        return (<React.Fragment>
            <Button onPress={() => {
                abortConnectionRequest()
            }}>Cancel</Button>
            {
                connectionPending
                    ? <ActivityIndicator style={{ marginHorizontal: 5, transform: [{ scale: .8 }] }} />
                    : <Button
                        disabled={!channelName}
                        onPress={() => {
                            hideDialog();
                            resetAddDeviceDialog();
                        }}
                    >
                        Done
                    </Button>
            }
        </React.Fragment>)
    }

    let dialogStyle = {}
    if (Platform.OS == "web") {
        dialogStyle = { alignSelf: 'center', maxWidth: 540, backgroundColor: 'white' }
    }
    return (
        <Context_AddDeviceDialog.Provider value={{
            addressCode: {
                value: addressCode,
                set: setAddressCode
            },
            username: {
                value: username,
                set: setUsername
            },
            currentRouteName
        }}>
            <Dialog visible={visible} onDismiss={onDismiss} style={dialogStyle}>
                <Dialog.Title>Send Connection Request</Dialog.Title>
                {dialogStep == 0 &&
                    <Dialog.Content>
                        <View style={{ minHeight: 260 }}>
                            <NavigationContainer onStateChange={(state) => {
                                updateWindowTitle()
                                if (state) setCurrentRouteName(state.routes[state.index].name)
                            }}>
                                <Tab.Navigator
                                    screenOptions={{
                                        sceneStyle: { backgroundColor: 'clear', minHeight: 200 }
                                    }}
                                    style={{
                                    }}
                                    initialRouteName='By Signal Server'>
                                    <Tab.Screen name="By Address" component={Tab_ByAddress} />
                                    <Tab.Screen name="By Signal Server" component={Tab_BySignalServer} />
                                </Tab.Navigator>
                            </NavigationContainer>
                        </View>
                    </Dialog.Content>
                }
                {dialogStep == 1 &&
                    DialogContent_Step2()
                }
                {/*
            <Dialog.Content>
                {dialogStep == 0 && DialogContent_Step1_ByAddress()}
                {dialogStep == 1 && DialogContent_Step2()}
            </Dialog.Content>*/}
                <Dialog.Actions>
                    {dialogStep == 0 && DialogActions_Step1()}
                    {dialogStep == 1 && DialogActions_Step2()}
                </Dialog.Actions>
            </Dialog>
        </Context_AddDeviceDialog.Provider>
    );
};

interface AddDeviceDialogProps {
    visible: boolean,
    setVisible: React.Dispatch<React.SetStateAction<boolean>>
}

export default AddDeviceDialog;