import React, { useState, useRef, useContext, useEffect } from 'react'
import { Menu, Divider, Dialog, Text, Button, Portal } from 'react-native-paper';
import { allChatChannelsData } from '../ChatData';
import { ToastAndroid } from 'react-native';
import { AppLevelActions } from '../../App';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';

import { getCurrentRouteKey } from '../util/navigation';
import { connectToHost, disconnectFromHost } from '../UserActions';
import { getSocketStatus, isConnectedToRemoteHost, SocketStatus } from '../Networking';

function ChatScreenElipsisMenu({ visible, onDismiss, anchor, channelId, setConnectionStatus_parent }: Props) {
    const appLevelActions = useContext(AppLevelActions)
    const navigation = useNavigation()

    const [dialogOpen_clear, setDialogOpen_clear] = useState(false)
    const [dialogOpen_delete, setDialogOpen_delete] = useState(false)
    const messageHistorySizeRef = useRef(0) //Using a ref prevents unwanted visual change from rerender before dialog closes.

    const [connectionStatus, setConnectionStatus] = useState(SocketStatus.Disconnected)

    useEffect(() => {
        setConnectionStatus(getSocketStatus(channelId))
    })

    //Dialog - Clear

    function showDialog_clear() {
        onDismiss()
        messageHistorySizeRef.current = allChatChannelsData[channelId]?.messages.length || 0
        setDialogOpen_clear(true)
    }

    function hideDialog_clear() {
        setDialogOpen_clear(false)
    }

    function confirmDialog_clear() {
        hideDialog_clear()
        appLevelActions.clearChatHistory(channelId)

        //If we currently have that channel open, we need to rerender
        if (getCurrentRouteKey(navigation) == channelId) {
            navigation.navigate(channelId, { forceRerender: new Date().toISOString() });
        }
    }

    //Dialog - Delete

    function showDialog_delete() {
        onDismiss()
        setDialogOpen_delete(true)
    }

    function hideDialog_delete() {
        setDialogOpen_delete(false)
    }

    function confirmDialog_delete() {
        hideDialog_delete()
        appLevelActions.deleteChatConnection(channelId)
        navigation.navigate('Home')
        ToastAndroid.show(`Deleted connection: ${channelId}`, ToastAndroid.SHORT)
    }

    //Connect/Disconnect

    function menuAction_connectToHost() {
        onDismiss()
        connectToHost(channelId, {
            onConnect() {
                ToastAndroid.show(`Connected to ${channelId}`, ToastAndroid.SHORT)
                setConnectionStatus_parent(SocketStatus.Connected)
            },
            onError(error : Error) {
                setConnectionStatus_parent(SocketStatus.ConnectionError)
            }
        })
    }

    function menuAction_disconnectFromHost() {
        onDismiss()
        const success = disconnectFromHost(channelId)
        if (success) {
            setConnectionStatus_parent(SocketStatus.Disconnected)
            ToastAndroid.show(`Disconnected from ${channelId}`, ToastAndroid.SHORT)
        }
    }

    const alertColor = 'red';
    return (
        <React.Fragment>
            <Menu
                visible={visible}
                onDismiss={onDismiss}
                anchor={anchor}>
                <Menu.Item onPress={() => { }} title="Details" />
                {connectionStatus == SocketStatus.Connected && <Menu.Item onPress={menuAction_disconnectFromHost} title="Disconnect" />}
                {[SocketStatus.Disconnected, SocketStatus.ConnectionError].includes(connectionStatus) &&
                    <Menu.Item onPress={menuAction_connectToHost} title="Connect" />}
                <Divider />
                <Menu.Item onPress={showDialog_clear} titleStyle={{ color: alertColor }} title="Clear Chat History" />
                <Menu.Item onPress={showDialog_delete} titleStyle={{ color: alertColor }} title="Delete Connection" />
            </Menu>
            <Portal>
                <Dialog visible={dialogOpen_clear} onDismiss={hideDialog_clear}>
                    <Dialog.Title style={{ color: alertColor }}>Clear Chat History?</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium">{`${messageHistorySizeRef.current} messages will be deleted. The other device will keep their copy of the conversation.`}</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={hideDialog_clear}>Cancel</Button>
                        <Button onPress={confirmDialog_clear}>Confirm</Button>
                    </Dialog.Actions>
                </Dialog>
                <Dialog visible={dialogOpen_delete} onDismiss={hideDialog_delete}>
                    <Dialog.Title style={{ color: alertColor }}>Delete Connection?</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium">Your message history will be lost, and you will need to add the device again to send or receive messages. The other device will keep their copy of the chat history, and can request to reconnect.</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={hideDialog_delete}>Cancel</Button>
                        <Button onPress={confirmDialog_delete}>Confirm</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </React.Fragment>
    )
}

interface Props {
    visible: boolean,
    onDismiss: () => void,
    anchor: React.ReactNode | { x: number, y: number },
    channelId: string,
    setConnectionStatus_parent: (value: SocketStatus) => void
}

export default ChatScreenElipsisMenu;