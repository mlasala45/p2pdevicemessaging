import React, { useState, useRef, useContext, useEffect } from 'react'
import { Menu, Divider, Dialog, Text, Button, Portal } from 'react-native-paper';
import { allChatChannelsContentData, deleteChatChannel, onChannelContentModified } from '../ChatData';
import { AppLevelActions, forceRerenderApp } from '../App';
import { useNavigation } from '@react-navigation/native';

import { getCurrentRouteKey } from '../util/navigation';
import { DeviceIdentifier, toString } from '../networking/DeviceIdentifier';
import Toast from 'react-native-toast-message';
import { disconnectPeerConnection, checkPeerConnectionStatus, SocketStatus } from '../networking/P2PNetworking';
import { connectExistingChatChannel } from '../networking/ChatNetworking';
import { raiseEvent } from '../util/Events';
import { Events } from '../events';

function ChatScreenElipsisMenu({ visible, onDismiss, anchor, channelId, setConnectionStatus_parent }: Props) {
    const appLevelActions = useContext(AppLevelActions)
    const navigation = useNavigation()

    const [dialogOpen_clear, setDialogOpen_clear] = useState(false)
    const [dialogOpen_delete, setDialogOpen_delete] = useState(false)
    const messageHistorySizeRef = useRef(0) //Using a ref prevents unwanted visual change from rerender before dialog closes.

    const [connectionStatus, setConnectionStatus] = useState(SocketStatus.Disconnected)

    useEffect(() => {
        setConnectionStatus(checkPeerConnectionStatus(channelId))
    })

    //Dialog - Clear

    function showDialog_clear() {
        onDismiss()
        messageHistorySizeRef.current = allChatChannelsContentData.get(channelId)?.messages.length || 0
        setDialogOpen_clear(true)
    }

    function hideDialog_clear() {
        setDialogOpen_clear(false)
    }

    function confirmDialog_clear() {
        hideDialog_clear()
        const contentData = allChatChannelsContentData.get(channelId)
        console.log("confirmDialog_clear")
        console.dir(contentData)
        if (contentData) {
            contentData.messages = []
            onChannelContentModified(channelId)
            forceRerenderApp()

            raiseEvent(Events.onClearChatHistory, { channelId })
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
        deleteChatChannel(channelId)
        //@ts-ignore
        navigation.navigate('Home')
        Toast.show({
            type: 'success',
            text1: `Deleted connection: ${channelId}`, //TODO: Use channel name
            visibilityTime: 2000
        })
    }

    //Connect/Disconnect

    function menuAction_connectToHost() {
        onDismiss()
        setConnectionStatus_parent(SocketStatus.Connecting) //TODO: Handle Errors
        connectExistingChatChannel(channelId)
    }

    function menuAction_disconnectFromHost() {
        onDismiss()
        disconnectPeerConnection(channelId)
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
    channelId: DeviceIdentifier,
    setConnectionStatus_parent: (value: SocketStatus) => void,
}

export default ChatScreenElipsisMenu;