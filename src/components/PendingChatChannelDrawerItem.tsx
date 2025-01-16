import React, { useState, useEffect } from 'react'
import { View, TouchableOpacity, Text, StyleSheet, Pressable } from 'react-native';
import { ActivityIndicator, Icon, IconButton } from 'react-native-paper';
import PendingChatChannelElipsisMenu from './PendingChatChannelElipsisMenu';
import { checkPeerConnectionStatus } from '../networking/P2PNetworking';
import { SocketStatus } from '../networking/P2PNetworking';

import { DeviceIdentifier } from '../networking/DeviceIdentifier';

function PendingChatChannelDrawerItem({ label, peerId, isOutbound }: Props) {
    const [isElipsisMenuOpen, setIsElipsisMenuOpen] = useState(false)

    function openElipsisMenu() {
        setIsElipsisMenuOpen(true)
    }

    function closeElipsisMenu() {
        setIsElipsisMenuOpen(false)
    }

    return (
        <View style={{ flexDirection: 'row', paddingHorizontal: 1, justifyContent: 'space-between', alignItems: 'center' }}>
            <Text allowFontScaling={undefined} style={styles.textOuter}>
                <Text allowFontScaling={undefined} style={styles.textInner}>
                    {label}
                </Text>
            </Text>
            <View style={styles.iconsView}>
                <Text allowFontScaling={undefined} style={{ ...styles.textInner, color: 'red' }}>
                    {isOutbound ? 'Request Sent' : 'Accept?'}
                </Text>
                <PendingChatChannelElipsisMenu
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
                    peerId={peerId}
                    isOutboundRequest={isOutbound}
                >
                </PendingChatChannelElipsisMenu>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    textOuter: {
        "lineHeight": 24,
        //"textAlignVertical": "center",
        "fontFamily": "sans-serif-medium",
        "fontWeight": "normal"
    },
    textInner: {
        "color": "rgba(28, 28, 30, 0.68)",
        "fontFamily": 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
        "fontWeight": 500,
        "lineHeight": 24,
        //"textAlignVertical": "center"
    },
    iconsView: { flexDirection: 'row', alignItems: 'center' }
});

interface Props {
    label: string,
    peerId: DeviceIdentifier,
    isOutbound: boolean
}

export default PendingChatChannelDrawerItem;