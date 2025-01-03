import React, { useState, useEffect } from 'react'
import { View, TouchableOpacity, Text, StyleSheet, Pressable } from 'react-native';
import { ActivityIndicator, Icon, IconButton } from 'react-native-paper';
import ChatChannelElipsisMenu from './ChatChannelElipsisMenu';
import { checkPeerConnectionStatus } from '../networking/P2PNetworking';
import { SocketStatus } from '../networking/P2PNetworking';

import { DeviceIdentifier } from '../networking/DeviceIdentifier';

function ChatChannelDrawerItem({ label, onPress, channelId }: Props) {
    const [isElipsisMenuOpen, setIsElipsisMenuOpen] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState(SocketStatus.Disconnected)

    function openElipsisMenu() {
        setIsElipsisMenuOpen(true)
    }

    function closeElipsisMenu() {
        setIsElipsisMenuOpen(false)
    }

    useEffect(() => {
        setConnectionStatus(checkPeerConnectionStatus(channelId))
    })

    return (
        <View style={{ flexDirection: 'row', paddingHorizontal: 1, justifyContent: 'space-between' }}>
            <Text allowFontScaling={undefined} style={styles.textOuter}>
                <Text allowFontScaling={undefined} style={styles.textInner}>
                    {label}
                </Text>
            </Text>
            <View style={styles.iconsView}>
                {(connectionStatus == SocketStatus.Connected || connectionStatus == SocketStatus.Disconnected) &&
                    <Icon
                        source="connection"
                        size={20}
                        color={connectionStatus == SocketStatus.Connected ? 'green' : 'red'}
                    />}
                {connectionStatus == SocketStatus.ConnectionError &&
                    <Icon
                        source="alert-circle-outline"
                        size={20}
                        color='red'
                    />}
                    {connectionStatus == SocketStatus.Connecting &&
                    <ActivityIndicator style={{transform: [{ scale: .8 }]}}/>}

                <ChatChannelElipsisMenu
                    visible={isElipsisMenuOpen}
                    onDismiss={closeElipsisMenu}
                    anchor={
                        <Pressable>
                            <IconButton
                                icon="dots-vertical"
                                size={20}
                                iconColor='black'
                                style={{ margin: 0 }}
                                onPress={openElipsisMenu}
                            />
                        </Pressable>
                    }
                    channelId={channelId}
                    setConnectionStatus_parent={setConnectionStatus}
                >
                </ChatChannelElipsisMenu>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    textOuter: {
        "lineHeight": 24,
        "textAlignVertical": "center",
        "fontFamily": "sans-serif-medium",
        "fontWeight": "normal"
    },
    textInner: {
        "color": "rgba(28, 28, 30, 0.68)",
        "fontFamily": 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
        "fontWeight": 500,
        "lineHeight": 24,
        "textAlignVertical": "center"
    },
    iconsView: { flexDirection: 'row', maxWidth: 40, alignItems: 'center' }
});

interface Props {
    label: string,
    connected: boolean,
    channelId: DeviceIdentifier
}

export default ChatChannelDrawerItem;