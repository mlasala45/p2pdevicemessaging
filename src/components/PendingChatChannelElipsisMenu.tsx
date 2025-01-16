import React, { useState, useRef, useContext, useEffect } from 'react'
import { Menu, Divider, Dialog, Text, Button, Portal, useTheme } from 'react-native-paper';
import { allChatChannelsContentData, allChatChannelsDetailsData, deleteChatChannel, onChannelContentModified } from '../ChatData';
import { AppLevelActions, forceRerenderApp } from '../App';
import { useNavigation } from '@react-navigation/native';

import { DeviceIdentifier, toString } from '../networking/DeviceIdentifier';
import Toast from 'react-native-toast-message';
import { disconnectPeerConnection, checkPeerConnectionStatus, SocketStatus, operateOnPendingRequest, PendingRequestOperation } from '../networking/P2PNetworking';
import { connectExistingChatChannel } from '../networking/ChatNetworking';
import { raiseEvent } from '../util/Events';
import { Events } from '../events';
import { StyleSheet, View } from 'react-native';
import { Clipboard } from '../util/ClipBoard';

function PendingChatScreenElipsisMenu({ visible, onDismiss, anchor, peerId, isOutboundRequest }: Props) {
    const [dialogOpen_details, setDialogOpen_details] = useState(false)

    const fullDetailsTextRef = useRef('')

    const { colors, dark } = useTheme()

    useEffect(() => {
        //
    })

    //Dialog - Details

    function showDialog_details() {
        onDismiss()
        setDialogOpen_details(true)
    }

    function hideDialog_details() {
        setDialogOpen_details(false)
    }

    //Menu Actions

    function menuAction_abortRequest() {
        onDismiss()
        operateOnPendingRequest(PendingRequestOperation.Cancel, peerId)
    }

    function menuAction_acceptRequest() {
        onDismiss()
        operateOnPendingRequest(PendingRequestOperation.Accept, peerId)
    }

    function menuAction_dismissRequest() {
        onDismiss()
        operateOnPendingRequest(PendingRequestOperation.Reject, peerId)
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

        const details = allChatChannelsDetailsData.get(peerId)
        fullDetailsTextRef.current = ''

        return (
            <React.Fragment>
                {Line('Peer Address', toString(details?.id))}
                {Line('Request Sent', details?.lastAccessedTime.toLocaleString())}
            </React.Fragment>
        )
    }

    const infoDialogTitleColor = dark ? 'white' : 'black'
    return (
        <React.Fragment>
            <Menu
                visible={visible}
                onDismiss={onDismiss}
                anchor={anchor}>
                <Menu.Item onPress={showDialog_details} title="Details" />
                {isOutboundRequest && <Menu.Item onPress={menuAction_abortRequest} title="Cancel Request" />}
                {!isOutboundRequest && <React.Fragment>
                    <Menu.Item onPress={menuAction_acceptRequest} title="Accept" />
                    <Menu.Item onPress={menuAction_dismissRequest} title="Dismiss" />
                </React.Fragment>}
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
    peerId: DeviceIdentifier,
    isOutboundRequest: boolean
}

export default PendingChatScreenElipsisMenu;