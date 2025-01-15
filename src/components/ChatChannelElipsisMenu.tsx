import React, { useState, useRef, useContext, useEffect } from 'react'
import { Menu, Divider, Dialog, Text, Button, Portal, useTheme } from 'react-native-paper';
import { allChatChannelsContentData, allChatChannelsDetailsData, deleteChatChannel, onChannelContentModified } from '../ChatData';
import { AppLevelActions, forceRerenderApp } from '../App';
import { useNavigation } from '@react-navigation/native';

import { getCurrentRouteKey } from '../util/navigation';
import { DeviceIdentifier, toString } from '../networking/DeviceIdentifier';
import Toast from 'react-native-toast-message';
import { disconnectPeerConnection, checkPeerConnectionStatus, SocketStatus } from '../networking/P2PNetworking';
import { connectExistingChatChannel } from '../networking/ChatNetworking';
import { raiseEvent } from '../util/Events';
import { Events } from '../events';
import { StyleSheet, View } from 'react-native';
import { Clipboard } from '../util/ClipBoard';

function ChatScreenElipsisMenu({ visible, onDismiss, anchor, channelId, setConnectionStatus_parent }: Props) {
    const appLevelActions = useContext(AppLevelActions)
    const navigation = useNavigation()

    const [dialogOpen_clear, setDialogOpen_clear] = useState(false)
    const [dialogOpen_delete, setDialogOpen_delete] = useState(false)
    const [dialogOpen_details, setDialogOpen_details] = useState(false)
    const messageHistorySizeRef = useRef(0) //Using a ref prevents unwanted visual change from rerender before dialog closes.

    const [connectionStatus, setConnectionStatus] = useState(SocketStatus.Disconnected)

    const fullDetailsTextRef = useRef('')

    const { colors, dark } = useTheme()

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

            raiseEvent(Events.onChatHistoryCleared, { channelId })
            raiseEvent(Events.onChatHistoryModified, { channelId })
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

    //Dialog - Details

    function showDialog_details() {
        onDismiss()
        setDialogOpen_details(true)
    }

    function hideDialog_details() {
        setDialogOpen_details(false)
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

    function DetailsDialogContent() {
        function Line(label: string, value?: string) {
            if (!value) value = 'MISSING'

            const prefix = fullDetailsTextRef.current != '' ? '\n' : ''
            fullDetailsTextRef.current += prefix + `${label}: ${value}`

            return (<View style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
                <Text style={{ fontWeight: 'bold' }}>{label}: </Text>
                <Text variant='bodyMedium'>{value}</Text>
            </View>)
        }

        const details = allChatChannelsDetailsData.get(channelId)
        fullDetailsTextRef.current = ''
        
        return (
            <React.Fragment>
                {Line('Name', details?.name)}
                {Line('Peer Address', toString(details?.id))}
                {Line('Last Connected', details?.lastAccessedTime.toLocaleString())}
                {Line('Last Message', details?.lastMessageTime.toLocaleString())}
                {Line('Created', details?.timeCreated.toLocaleString())}
            </React.Fragment>
        )
    }

    const alertDialogTitleColor = 'red';
    const infoDialogTitleColor = dark ? 'white' : 'black'
    return (
        <React.Fragment>
            <Menu
                visible={visible}
                onDismiss={onDismiss}
                anchor={anchor}>
                <Menu.Item onPress={showDialog_details} title="Details" />
                {connectionStatus == SocketStatus.Connected && <Menu.Item onPress={menuAction_disconnectFromHost} title="Disconnect" />}
                {[SocketStatus.Disconnected, SocketStatus.ConnectionError].includes(connectionStatus) &&
                    <Menu.Item onPress={menuAction_connectToHost} title="Connect" />}
                <Divider />
                <Menu.Item onPress={showDialog_clear} titleStyle={{ color: alertDialogTitleColor }} title="Clear Chat History" />
                <Menu.Item onPress={showDialog_delete} titleStyle={{ color: alertDialogTitleColor }} title="Delete Connection" />
            </Menu>
            <Portal>
                <Dialog visible={dialogOpen_details} onDismiss={hideDialog_details} style={styles.dialog}>
                    <Dialog.Title style={{ color: infoDialogTitleColor }}>Channel Details</Dialog.Title>
                    <Dialog.Content>
                        {DetailsDialogContent()}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={hideDialog_details}>Close</Button>
                        <Button onPress={() => {
                            Clipboard.setString(fullDetailsTextRef.current)
                        }}>Copy</Button>
                    </Dialog.Actions>
                </Dialog>
                <Dialog visible={dialogOpen_clear} onDismiss={hideDialog_clear} style={styles.dialog}>
                    <Dialog.Title style={{ color: alertDialogTitleColor }}>Clear Chat History?</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium">{`${messageHistorySizeRef.current} messages will be deleted. The other device will keep their copy of the conversation.`}</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={hideDialog_clear}>Cancel</Button>
                        <Button onPress={confirmDialog_clear}>Confirm</Button>
                    </Dialog.Actions>
                </Dialog>
                <Dialog visible={dialogOpen_delete} onDismiss={hideDialog_delete} style={styles.dialog}>
                    <Dialog.Title style={{ color: alertDialogTitleColor }}>Delete Connection?</Dialog.Title>
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

const styles = StyleSheet.create({
    dialog: {
        maxWidth: 500,
        maxHeight: 250,
        alignSelf: 'center'
    }
})

interface Props {
    visible: boolean,
    onDismiss: () => void,
    anchor: React.ReactNode | { x: number, y: number },
    channelId: DeviceIdentifier,
    setConnectionStatus_parent: (value: SocketStatus) => void,
}

export default ChatScreenElipsisMenu;