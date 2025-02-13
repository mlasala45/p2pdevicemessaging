import { StyleSheet, View } from "react-native"
import { IconButton, Text } from "react-native-paper"
import { DeviceIdentifier, toString } from "../networking/DeviceIdentifier"
import React, { Ref, useState } from "react"
import { raiseEvent } from "../util/Events"
import { Events } from "../events"

export function ChatScreenHeader({ setNumSelectedRef, copySelectedMessagesToClipboard, channelId, navigation }: ChatScreenHeaderProps) {
    const [numSelected, setNumSelected] = useState(0)

    //@ts-ignore
    setNumSelectedRef.current = setNumSelected
    return <View style={{
        height: 64,
        position: 'absolute',
        flexDirection: 'row',
        backgroundColor: 'white',
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: '#d8d8d8',
        justifyContent: 'space-between'
    }}>
        <View style={{ flexDirection: 'row' }}>
            <IconButton
                icon='menu'
                iconColor='black'
                style={{
                    height: 'auto'
                }}
                onPress={() => {
                    navigation.openDrawer()
                }} />
            <View style={{
                justifyContent: 'center',
                marginLeft: 4
            }}>
                <Text style={{
                    fontSize: 18,
                    fontWeight: '500',
                    color: 'black',
                    fontFamily: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"'
                }}>{toString(channelId)}</Text>
            </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {numSelected > 0 &&
                <React.Fragment>
                    <IconButton
                        icon='content-copy'
                        style={styles.iconButton}
                        iconColor='black'
                        onPress={() => {
                            copySelectedMessagesToClipboard()
                        }} />
                    <IconButton
                        icon='delete'
                        style={styles.iconButton}
                        iconColor='black'
                        onPress={() => {raiseEvent(Events.openDialog_deleteSelectedMessages, { channelId })}} />
                </React.Fragment>
            }
        </View>
    </View>
}

const styles = StyleSheet.create({
    iconButton: {
        //@ts-ignore
        height: 'fit-content',
        aspectRatio: 1
    }
})

interface ChatScreenHeaderProps {
    setNumSelectedRef: Ref<any>
    copySelectedMessagesToClipboard: () => void,
    channelId: DeviceIdentifier,
    navigation: any
}