import React, { createContext, forwardRef, memo, Ref, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, FlatList, Text, Animated, Platform } from 'react-native';
import { IconButton, TextInput } from 'react-native-paper';
import { allChatChannelsContentData, ChatChannelContentData, ChatMessageData, ChatMessageStatus, loadChannelContentFromStorage, onChannelContentModified, recalculateChannelAnnotations } from '../ChatData';
import ChatChannelElipsisMenu from '../components/ChatChannelElipsisMenu';
import { toTimeString } from '../util/date';
import { attemptToProcessReceivedMessages, attemptToSendQueuedMessages, enqueueOutboundMessage, isMessagePending, MessageRawData } from '../networking/ChatNetworking';

import styles from './styles-ChatScreen'

import { DeviceIdentifier, KeyFunctions_DeviceIdentifier, toString } from '../networking/DeviceIdentifier';
import ArrayDictionary from '../util/ArrayDictionary';
import { checkPeerConnectionStatus, currentSignalServerUsername, SocketStatus } from '../networking/P2PNetworking';
import { enqueuePushNotification } from '../foreground-service';
import { Pressable } from 'react-native-gesture-handler';
import { DrawerHeaderProps } from '@react-navigation/drawer';

import { ChatScreenHeader } from '../components/ChatScreenHeader';
import Toast from 'react-native-toast-message';
import { registerEventHandler } from '../util/Events';
import { EventData_channelId, Events } from '../events';
import { Clipboard } from '../util/ClipBoard';

const LONG_PRESS_MIN_MS = 250

interface ChatBubbleProps {
    msgData: ChatMessageData
    onLayout: () => void,
    onSelectedChanged: (id: string, selected: boolean) => void,
    allowQuickSelect: () => boolean
}

function ChatBubble({ msgData, onLayout, onSelectedChanged, allowQuickSelect }: ChatBubbleProps) {
    const { id, contentStr, status, timeSent } = msgData

    const [selected, setSelected] = useState(false)

    /**Does the message belong to the local host? */
    const local = status != ChatMessageStatus.ReceivedFromRemoteHost
    const showStateMessage = true

    let stateMessageIsError = false
    let stateMessage: string = ''
    if (status == ChatMessageStatus.ReceivedFromRemoteHost || status == ChatMessageStatus.Delivered) {
        stateMessage = toTimeString(new Date(timeSent))
    }
    else if (status == ChatMessageStatus.PendingSend) {
        stateMessage = 'Pending'
        stateMessageIsError = true
    }
    else if (status == ChatMessageStatus.NotSent) {
        stateMessage = 'Not Sent'
        stateMessageIsError = true
    }

    function toggleSelected() {
        console.log("toggleSelected")
        const newVal = !selected
        setSelected(newVal)
        onSelectedChanged(id, newVal)
    }

    //On web, all chats are left-aligned, due to the wide layout
    const messageShouldBeLeftAligned = !local || Platform.OS == 'web'
    let chatBubbleAlignStyles = messageShouldBeLeftAligned ? styles.chatBubbleLeft : styles.chatBubbleRight
    const chatBubbleViewStyle = {
        ...styles.chatBubbleCommon,
        ...chatBubbleAlignStyles,
        backgroundColor: selected ? 'darkblue' : '#6495ED',
        borderColor: selected ? 'white' : 'black'
    }

    const textAlign = messageShouldBeLeftAligned ? 'left' : 'right'

    //Components in the list are drawn bottom-to-top
    return (
        <React.Fragment>
            {showStateMessage &&
                <Text style={{
                    textAlign,
                    color: stateMessageIsError ? 'red' : 'gray',
                    marginHorizontal: 5,
                    fontSize: 12,
                    marginBottom: 5
                }}>
                    {stateMessage}
                </Text>
            }
            <Pressable
                delayLongPress={LONG_PRESS_MIN_MS}
                onLongPress={toggleSelected}
                onPress={() => {
                    if (allowQuickSelect()) {
                        toggleSelected()
                    }
                }}
                style={chatBubbleViewStyle}
                onLayout={onLayout}>
                <Text style={styles.chatBubbleText}>{contentStr}</Text>
            </Pressable>
            {msgData.annotations?.isFirstFromThisUserInBlock &&
                <View style={{ ...chatBubbleAlignStyles }}>
                    <Text style={{ color: 'white', fontWeight: 500, margin: 5 }}>{msgData.user}</Text>
                </View>
            }
        </React.Fragment >
    )
}


function ChatBubbleInvisible({ contentStr, viewRef }: { contentStr: string, viewRef: React.RefObject<View> }) {
    return (
        <View style={{
            ...styles.chatBubbleCommon,
            position: 'absolute',
            opacity: 0,
            backgroundColor: 'orange'
        }}
            id='invisible-chat-bubble'
            ref={viewRef}>
            <Text style={{
                ...styles.chatBubbleText,
                opacity: 0,
            }}>{contentStr}</Text>
        </View >
    )
}


interface ChatBubblesListProps {
    messages: ChatMessageData[],
    latestMessageUpdateTimestamp: number,
    onChatBubbleLayout: () => void,
    onChatBubbleSelectedChanged: (msgId: string, selected: boolean) => void,
    allowQuickSelect: () => boolean,
}

const ChatBubblesList = memo(function ({ messages, latestMessageUpdateTimestamp, onChatBubbleLayout, onChatBubbleSelectedChanged, allowQuickSelect }: ChatBubblesListProps) {
    return <FlatList
        data={messages}
        renderItem={({ item }) => <ChatBubble
            msgData={item}
            onLayout={onChatBubbleLayout}
            onSelectedChanged={onChatBubbleSelectedChanged}
            allowQuickSelect={allowQuickSelect} />}
        keyExtractor={item => item.id}
        inverted={true}
        style={{ padding: 5 }}
    />
}, (prevProps, nextProps) => {
    //Ignore all props except for latestMessageId when deciding whether to rerender
    return prevProps.latestMessageUpdateTimestamp == nextProps.latestMessageUpdateTimestamp
})

interface ChatScreenNetworkingCallbacks {
    id: DeviceIdentifier,
    onMessageReceived: (data: MessageRawData) => void,
    onMessageDelivered: (msgId: string) => void,
    onConnected: () => void,
    onDisconnected: () => void,
    onConnectionStateChanged: (newStatus: SocketStatus) => void
}

export const chatScreenNetworkCallbacks = new ArrayDictionary<DeviceIdentifier, ChatScreenNetworkingCallbacks>(KeyFunctions_DeviceIdentifier)
//TODO: Decide how to set 'route' var type
function ChatScreen({ navigation, route }: Props): React.JSX.Element {
    const channelId: DeviceIdentifier = route.params?.channelId

    //Core states
    const [inputText, setInputText] = React.useState('')
    const [connectionStatus, setConnectionStatus] = React.useState(SocketStatus.Disconnected)
    const [isElipsisMenuOpen, setIsElipsisMenuOpen] = React.useState(false)
    const [numSelected, setNumSelected] = useState(0)

    //"Incoming Message" states
    const [waitingForIncomingMessageAnimToFinish, setWaitingForIncomingMessageAnimToFinish] = React.useState(false)
    const [mostRecentChatHeight, setMostRecentChatHeight] = React.useState(0)
    const [incomingMessageQueue_premeasurement, setIncomingMessageQueue_premeasurement] = React.useState([] as ChatMessageData[])
    const [incomingMessageQueue_postmeasurement, setIncomingMessageQueue_postmeasurement] = React.useState([] as { height: number, messageData: ChatMessageData }[])

    //Util states
    const [toggleToUpdate, setToggleToUpdate] = React.useState(false)
    const [latestMessageUpdateTimestamp, setLatestMessageUpdateTimestamp] = React.useState(0)

    //Refs
    const scrollOffset = React.useRef(new Animated.Value(0)).current;
    const invisibleChatBubbleRef = React.useRef<View>(null)
    const menuButtonRef = React.useRef<View>(null)
    const menuPosition = React.useRef({ x: 0, y: 0 })
    const numSelectedRef = useRef(0)
    const setNumSelectedRef = useRef(null)

    const channelContentData = React.useRef(undefined as ChatChannelContentData | undefined)
    channelContentData.current = allChatChannelsContentData.get(channelId)

    function setElipsisMenuPosition(x: number, y: number) {
        console.log('setElipsisMenuPosition')
        menuPosition.current = { x, y };
        console.log(menuPosition.current)
    }

    function openElipsisMenu() {
        setIsElipsisMenuOpen(true);
    }

    function closeElipsisMenu() {
        setIsElipsisMenuOpen(false);
    }

    useLayoutEffect(() => {
        navigation.setOptions({
            header: (headerProps: DrawerHeaderProps) => {
                return <ChatScreenHeader
                    setNumSelectedRef={setNumSelectedRef}
                    copySelectedMessagesToClipboard={copySelectedMessagesToClipboard}
                    channelId={channelId}
                    navigation={navigation} />
            },
            headerRight: () => {
                return <View onLayout={(event) => {
                    menuButtonRef.current?.measure((x, y, width, height, pageX, pageY) => {
                        setElipsisMenuPosition(pageX, pageY)
                    })
                }}><IconButton
                        icon="dots-vertical"
                        size={24}
                        iconColor='black'
                        onPress={() => openElipsisMenu()}
                        ref={menuButtonRef}
                    /></View>
            }
        });
    }, [navigation]);

    //The first time the component is rendered, retrieve the chat history from storage
    useEffect(() => {
        console.log(`Chat channel data load`)
        loadChannelContentFromStorage(channelId).then(() => {
            console.log(`Check phony`)
            const channelContentData = allChatChannelsContentData.get(channelId)!
            if (!channelContentData.phonyGenerated) {
                console.log(`Phony not generated; generating.`);
                const user = 'phony@localhost';
                [{
                    id: '0',
                    contentStr: `Hi! This is the chat for ${channelId}!`,
                    status: ChatMessageStatus.ReceivedFromRemoteHost,
                    timeSent: 0,
                    user
                },
                {
                    id: '1',
                    contentStr: `This is a second message!`,
                    status: ChatMessageStatus.ReceivedFromRemoteHost,
                    timeSent: 1,
                    user
                },
                {
                    id: '2',
                    contentStr: `And this is a third!`,
                    status: ChatMessageStatus.Delivered,
                    timeSent: 2,
                    user
                },
                {
                    id: '3',
                    contentStr: `And this is a really really really really really really really really really really really really really really really really really really really long message!!!`,
                    status: ChatMessageStatus.Delivered,
                    timeSent: 3,
                    user
                },
                {
                    id: '4',
                    contentStr: `This message has a newline!\nAnd then more text!\nIsn't it fabulous?`,
                    status: ChatMessageStatus.Delivered,
                    timeSent: 4,
                    user
                }].forEach((msgData) => {
                    channelContentData.messages.unshift(msgData)
                })
                channelContentData.phonyGenerated = true;
            }
            else {
                console.log(`Phony already generated`)
                if (channelContentData.messages.length > 0) console.log(`Last message: ${channelContentData.messages[0].contentStr}`);
            }
            setLatestMessageUpdateTimestamp(Date.now())
            forceRerender();
        })
    }, [])

    useEffect(() => {
        chatScreenNetworkCallbacks.set({
            id: channelId,
            onMessageReceived,
            onMessageDelivered,
            onConnected,
            onDisconnected,
            onConnectionStateChanged
        })

        setConnectionStatus(checkPeerConnectionStatus(channelId))

        attemptToProcessReceivedMessages()

        const eventHandlersKey = toString(channelId)
        registerEventHandler(Events.onClearChatHistory, eventHandlersKey, (e: EventData_channelId) => {
            if (channelId == e.channelId) {
                forceMessageListRerender()
            }
        })

        registerEventHandler(Events.onPeerConnectionEstablished, eventHandlersKey, (e) => {
            if (channelId == e.channelId) {
                forceMessageListRerender()
            }
        })
    })

    function forceMessageListRerender() {
        setLatestMessageUpdateTimestamp(Date.now())
    }

    //TODO: Refactor so only the invisible chat bubble rerenders
    useEffect(() => {
        if (!allChatChannelsContentData.containsKey(channelId)) return; //Channel contents are not yet loaded

        console.log(`Check pre-measure queue. length=${incomingMessageQueue_premeasurement.length}`)
        if (incomingMessageQueue_premeasurement.length > 0) {
            if (invisibleChatBubbleRef.current) {
                console.log("invisibleChatBubbleRef is PRESENT:")
                console.dir(invisibleChatBubbleRef.current)
            }
            else {
                console.log("invisibleChatBubbleRef is MISSING!")
            }

            if (Platform.OS == "web") {
                // @ts-ignore
                const rect = invisibleChatBubbleRef.current!.getBoundingClientRect();
                setIncomingMessageQueue_postmeasurement(prevData => [
                    ...prevData,
                    {
                        height: rect.height,
                        messageData: incomingMessageQueue_premeasurement[0]
                    }
                ])
            }
            else {
                //The queue is not empty, which means that the InvisibleChatBubble has been populated with the first element of the queue
                invisibleChatBubbleRef.current!.measure((x, y, width, height) => {
                    console.log(`onMeasure; height=${height}`)
                    //Add the item to the post-measurement queue
                    setIncomingMessageQueue_postmeasurement(prevData => [
                        ...prevData,
                        {
                            height: height,
                            messageData: incomingMessageQueue_premeasurement[0]
                        }
                    ])
                })
            }

            //Remove the item from the previous queue. The dispatched measurement SHOULD remain valid (TODO: Confirm)
            const id = incomingMessageQueue_premeasurement[0].id
            setIncomingMessageQueue_premeasurement(prevData => prevData.filter(item => item.id != id))
        }

        console.log(`Check post-measure queue. length=${incomingMessageQueue_postmeasurement.length}`)
        //Check the post-measurement queue. If it is not empty, pop the first element and animate it entering the visible chat history. If an animation is running, wait for it to finish.
        if (incomingMessageQueue_postmeasurement.length > 0 && !waitingForIncomingMessageAnimToFinish) {
            const height = incomingMessageQueue_postmeasurement[0].height
            const messageData = incomingMessageQueue_postmeasurement[0].messageData

            allChatChannelsContentData.get(channelId)!.messages.unshift(messageData)
            recalculateChannelAnnotations(channelId)
            forceMessageListRerender()
            onChannelContentModified(channelId)

            //Remove the message from the incoming queue
            setIncomingMessageQueue_postmeasurement(prevQueue => prevQueue.filter((item) => item.messageData.id != messageData.id))

            //Trigger the animation
            setMostRecentChatHeight(height)
            //Don't process the next message until this one finishes appearing
            setWaitingForIncomingMessageAnimToFinish(true)
        }
    })

    useEffect(() => {
        channelContentData.current?.messages.forEach(msgData => {
            if (msgData.status == ChatMessageStatus.PendingSend && !isMessagePending(msgData.id)) {
                msgData.status = ChatMessageStatus.NotSent
            }
        });
    })

    console.log(`Rerender; queue.length=${incomingMessageQueue_premeasurement.length}`)

    function forceRerender() {
        setToggleToUpdate(!toggleToUpdate)
    }

    function copySelectedMessagesToClipboard() {
        const messagesData: ChatMessageData[] = []
        selectedMessages.current.forEach(msgId => {
            const msgData = channelContentData.current?.messages.find(data => data.id == msgId)
            if (msgData) messagesData.push(msgData)
        })
        messagesData.sort((a, b) => a.timeSent - b.timeSent)

        let str = ""
        for (let i = 0; i < messagesData.length; i++) {
            str += messagesData[i].contentStr
            if (i < messagesData.length - 1) str += '\n'
        }

        Clipboard.setString(str)
    }

    function sendMessage(message: string) {
        message = message.trimEnd()
        console.log("sendMessage", message)
        setInputText('') //TODO: Clearing this late Could result in multiple sends from spamming the button. Rewrite to prevent.
        const msgData = {
            id: Date.now().toString(),
            contentStr: message,
            status: ChatMessageStatus.PendingSend,
            timeSent: Date.now(),
            user: `${currentSignalServerUsername}@localhost`
        }
        addNewMessageToAnimationQueue(msgData)
        enqueueOutboundMessage(channelId, { message, timeSent: Date.now() }, msgData.id)
    }

    function addNewMessageToAnimationQueue(messageData: ChatMessageData) {
        setIncomingMessageQueue_premeasurement(prevQueue => [
            ...prevQueue,
            messageData
        ])
        //console.log('onMessageAddedToChatHistory')
    }

    function onMessageReceived(data: MessageRawData) {
        console.log(`ChatScreen.onMessageReceived; message=${data.message}`)
        addNewMessageToAnimationQueue({
            id: Date.now().toString(),
            contentStr: data.message,
            status: ChatMessageStatus.ReceivedFromRemoteHost,
            timeSent: data.timeSent,
            user: toString(channelId)
        })

        enqueuePushNotification({
            title: toString(channelId),
            body: data.message,
            notifChannelId: 'default'
        })
    }

    function onMessageDelivered(id: string) {
        const msg = allChatChannelsContentData.get(channelId)!.messages.find(msg => msg.id == id)
        console.log(`onMessageDelivered id=${id}`)
        if (msg) {
            msg.status = ChatMessageStatus.Delivered
        }
        else {
            console.log("Failed to find message")
        }
        onChannelContentModified(channelId)

        forceRerender()
        setLatestMessageUpdateTimestamp(Date.now())
    }

    function onConnected() {
    }

    function onDisconnected() {
    }

    function onConnectionStateChanged(newStatus: SocketStatus) {
        setConnectionStatus(newStatus)
        attemptToSendQueuedMessages()
    }

    /**
     * Called whenever a new chat bubble is drawn to screen. Checks whether an there is an animation to start, and starts it if needed.
     */
    function onChatBubbleLayout() {
        //console.log(`onChatBubbleLayout (${mostRecentChatHeight})`)
        if (mostRecentChatHeight > 0) {
            scrollOffset.setValue(mostRecentChatHeight) //TODO: Plus margin?
            Animated.sequence([
                Animated.timing(scrollOffset, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start(onNewBubbleAnimationFinished);
            setMostRecentChatHeight(0);
        }
    }

    /**
     * Remove the animation waiting flag and trigger a re-render. The React Effect above will then process the next item in the post-measurement queue. 
     */
    function onNewBubbleAnimationFinished() {
        console.log("onNewBubbleAnimationFinished")
        setWaitingForIncomingMessageAnimToFinish(false)
    }

    const selectedMessages = useRef(new Set<string>())
    function onChatBubbleSelectedChanged(msgId: string, selected: boolean) {
        console.log("onChatBubbleSelectedChanged", msgId, selected)
        if (selected) {
            selectedMessages.current.add(msgId)
        }
        else {
            selectedMessages.current.delete(msgId)
        }

        numSelectedRef.current = selectedMessages.current.size
        if (setNumSelectedRef.current) {
            const setter = setNumSelectedRef.current as React.Dispatch<React.SetStateAction<number>>
            setter(numSelectedRef.current)
        }
    }


    console.log(`Rerender. menuPosition=${menuPosition.current.x},${menuPosition.current.y}`, "selectedMessages:", selectedMessages.current.size)
    return (
        <View style={styles.chatScreen}>
            {channelContentData.current &&
                <Animated.View style={{ transform: [{ translateY: scrollOffset }] }}>
                    <ChatBubblesList
                        messages={channelContentData.current?.messages}
                        latestMessageUpdateTimestamp={latestMessageUpdateTimestamp}
                        onChatBubbleLayout={onChatBubbleLayout}
                        onChatBubbleSelectedChanged={onChatBubbleSelectedChanged}
                        allowQuickSelect={() => numSelectedRef.current > 0}
                    />
                </Animated.View>}
            {connectionStatus != SocketStatus.Connected &&
                <Text style={{
                    color: 'red',
                    alignSelf: 'flex-end',
                    marginRight: 55
                }}>Not Connected</Text>
            }
            <View style={styles.footer}>
                <View style={styles.textInputContainer}>
                    <TextInput
                        value={inputText}
                        onChangeText={text => setInputText(text)}
                        onSubmitEditing={() => sendMessage(inputText)}
                        style={styles.textInput}
                        textColor='white'
                        underlineColor="transparent"
                        activeUnderlineColor='transparent'
                        cursorColor='white'
                        dense
                        multiline
                    />
                </View>
                <IconButton
                    icon="send"
                    iconColor={'#5dade2'}
                    size={24}
                    onPress={() => sendMessage(inputText)}
                />
            </View>
            {/* Invisible chat bubble is used to measure the exact height of new chat bubbles before they are added to the screen. */}
            <ChatBubbleInvisible contentStr={incomingMessageQueue_premeasurement.length > 0 && incomingMessageQueue_premeasurement[0].contentStr || ''} viewRef={invisibleChatBubbleRef} />
            <ChatChannelElipsisMenu
                visible={isElipsisMenuOpen}
                onDismiss={closeElipsisMenu}
                anchor={menuPosition.current}
                channelId={channelId}
                setConnectionStatus_parent={setConnectionStatus}
            />
        </View>
    )
}

//Not worth the development overhead of fully defining all the type parameters of NavigationProp and RouteProp
interface Props {
    navigation: any,
    route: any,
}

export default ChatScreen;