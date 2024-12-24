import React, { useContext, useEffect, useLayoutEffect } from 'react';
import { View, FlatList, Text, Animated } from 'react-native';
import { IconButton, TextInput } from 'react-native-paper';
import storage from '../Storage'
import { allChatChannelsData, ChatMessageData, ChatMessageStatus, loadChannelFromStorage } from '../ChatData';
import { enqueueOutboundMessage, MessageRawData, SocketStatus } from '../Networking';
import ChatChannelElipsisMenu from '../components/ChatChannelElipsisMenu';
import { toTimeString } from '../util/date';

import styles from './styles-ChatScreen'

import { AppLevelActions } from '../../App';

function ChatBubble({ contentStr, status, onLayout, timeSent }: ChatMessageData & { onLayout: () => void }) {
    /**Does the message belong to the local host? */
    const local = status != ChatMessageStatus.ReceivedFromRemoteHost
    const showStateMessage = true

    let stateMessageIsError = false
    let stateMessage : string = ''
    if(status == ChatMessageStatus.ReceivedFromRemoteHost || status == ChatMessageStatus.Delivered) {
        stateMessage = toTimeString(new Date(timeSent))
    }
    else if(status == ChatMessageStatus.PendingSend) {
        stateMessage = 'Pending'
        stateMessageIsError = true
    }

    return (
        <React.Fragment>
            {showStateMessage &&
                <Text style={{
                    textAlign: local ? 'right' : 'left',
                    color: stateMessageIsError ? 'red' : 'gray',
                    marginHorizontal: 5,
                    marginVertical: 0,
                    fontSize: 12
                }}>
                    {stateMessage}
                </Text>
            }
            <View style={{
                ...styles.chatBubbleCommon,
                ...(local ? styles.chatBubbleRight : styles.chatBubbleLeft)
            }}
                onLayout={onLayout}>
                <Text style={{
                    textAlign: 'left',
                    maxWidth: '70%',
                    color: 'white'
                }}>{contentStr}</Text>
            </View >

        </React.Fragment >
    )
}


function ChatBubbleInvisible({ contentStr, viewRef }: { contentStr: string, viewRef: React.RefObject<Text> }) {
    return (
        <View style={{
            ...styles.chatBubbleCommon,
            position: 'absolute',
            opacity: 0,
        }}
            ref={viewRef}>
            <Text style={{
                textAlign: 'left',
                maxWidth: '70%',
                opacity: 0,
                color: 'black',
                backgroundColor: 'red'
            }}>{contentStr}</Text>
        </View >
    )
}

export const onMessageReceivedCallbacks: Record<string, (data : MessageRawData) => void> = {}
export const onMessageDeliveredCallbacks: Record<string, (id : string) => void> = {}

//TODO: Decide how to type 'route'
function ChatScreen({ navigation, route }: Props): React.JSX.Element {
    const appLevelActions = useContext(AppLevelActions)
    const connection = route.params?.connection as string;

    //Core states
    const [inputText, setInputText] = React.useState('')
    const [connectionStatus, setConnectionStatus] = React.useState(SocketStatus.Disconnected)
    const [isElipsisMenuOpen, setIsElipsisMenuOpen] = React.useState(false)

    //"Incoming Message" states
    const [waitingForIncomingMessageAnimToFinish, setWaitingForIncomingMessageAnimToFinish] = React.useState(false)
    const [mostRecentChatHeight, setMostRecentChatHeight] = React.useState(0)
    const [incomingMessageQueue_premeasurement, setIncomingMessageQueue_premeasurement] = React.useState([] as ChatMessageData[])
    const [incomingMessageQueue_postmeasurement, setIncomingMessageQueue_postmeasurement] = React.useState([] as { height: number, messageData: ChatMessageData }[])

    //Util states
    const [toggleToUpdate, setToggleToUpdate] = React.useState(false)

    //Refs
    const scrollOffset = React.useRef(new Animated.Value(0)).current;
    const flatListRef = React.useRef<FlatList>(null)
    const invisibleChatBubbleRef = React.useRef<Text>(null)
    const menuButtonRef = React.useRef<View>(null)
    const menuPosition = React.useRef({ x: 0, y: 0 })

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

    function userAction_clearChatHistory() {
        allChatChannelsData[connection].messages = []
        forceUpdate()
    }

    function userAction_deleteChatConnection() {
        userAction_clearChatHistory()
        appLevelActions.deleteChatConnection(connection)
        navigation.navigate('Home')
    }

    useLayoutEffect(() => {
        navigation.setOptions({
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
        const channelId = connection
        loadChannelFromStorage(connection).then(() => {
            console.log(`Check phony`)
            if (true && !allChatChannelsData[channelId].phonyGenerated) {
                console.log(`Phony not generated; generating.`);
                [{
                    id: '0',
                    contentStr: `Hi! This is the chat for ${channelId}!`,
                    status: ChatMessageStatus.ReceivedFromRemoteHost,
                    timeSent: 0
                },
                {
                    id: '1',
                    contentStr: `This is a second message!`,
                    status: ChatMessageStatus.ReceivedFromRemoteHost,
                    timeSent: 1
                },
                {
                    id: '2',
                    contentStr: `And this is a third!`,
                    status: ChatMessageStatus.Delivered,
                    timeSent: 2
                },
                {
                    id: '3',
                    contentStr: `And this is a really really really really really really really really really really really really really really really really really really really long message!!!`,
                    status: ChatMessageStatus.Delivered,
                    timeSent: 3
                },
                {
                    id: '4',
                    contentStr: `This message has a newline!\nAnd then more text!\nIsn't it fabulous?`,
                    status: ChatMessageStatus.Delivered,
                    timeSent: 4
                }].forEach((msgData) => {
                    allChatChannelsData[channelId].messages.unshift(msgData)
                })
                allChatChannelsData[channelId].phonyGenerated = true;
            }
            else {
                console.log(`Phony already generated`)
                console.log(`Last message: ${allChatChannelsData[channelId].messages[0].contentStr}`);
            }
            forceUpdate();
        })
    }, [])

    useEffect(() => {
        onMessageReceivedCallbacks[connection] = onMessageReceived;
        onMessageDeliveredCallbacks[connection] = onMessageDelivered;
    })

    //TODO: Refactor so only the invisible chat bubble rerenders
    useEffect(() => {
        console.log(`Check pre-measure queue. length=${incomingMessageQueue_premeasurement.length}`)
        if (incomingMessageQueue_premeasurement.length > 0) {
            //The queue is not empty, which means that the InvisibleChatBubble has been populated with the first element of the queue
            invisibleChatBubbleRef.current?.measure((x, y, width, height) => {
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

            //Remove the item from the previous queue. The dispatched measurement SHOULD remain valid (TODO: Confirm)
            const id = incomingMessageQueue_premeasurement[0].id
            setIncomingMessageQueue_premeasurement(prevData => prevData.filter(item => item.id != id))
        }

        console.log(`Check post-measure queue. length=${incomingMessageQueue_postmeasurement.length}`)
        //Check the post-measurement queue. If it is not empty, pop the first element and animate it entering the visible chat history. If an animation is running, wait for it to finish.
        if (incomingMessageQueue_postmeasurement.length > 0 && !waitingForIncomingMessageAnimToFinish) {
            const height = incomingMessageQueue_postmeasurement[0].height
            const messageData = incomingMessageQueue_postmeasurement[0].messageData

            allChatChannelsData[connection].messages.unshift(messageData)
            storage.save({
                key: 'chatChannelsData',
                id: connection,
                data: allChatChannelsData[connection]
            })

            //Remove the message from the incoming queue
            setIncomingMessageQueue_postmeasurement(prevQueue => prevQueue.filter((item) => item.messageData.id != messageData.id))

            //Trigger the animation
            setMostRecentChatHeight(height)
            //Don't process the next message until this one finishes appearing
            setWaitingForIncomingMessageAnimToFinish(true)
        }
    })

    console.log(`Rerender; queue.length=${incomingMessageQueue_premeasurement.length}`)

    function forceUpdate() {
        setToggleToUpdate(!toggleToUpdate)
    }

    function sendMessage(message: string) {
        setInputText('') //TODO: Clearing this late Could result in multiple sends from spamming the button. Rewrite to prevent.
        const msgData = {
            id: Date.now().toString(),
            contentStr: message,
            status: ChatMessageStatus.PendingSend,
            timeSent: Date.now()
        }
        addNewMessageToAnimationQueue(msgData)
        enqueueOutboundMessage(connection, {message, timeSent: Date.now()}, msgData.id)
    }

    function addNewMessageToAnimationQueue(messageData: ChatMessageData) {
        setIncomingMessageQueue_premeasurement(prevQueue => [
            ...prevQueue,
            messageData
        ])
        //console.log('onMessageAddedToChatHistory')
    }

    function onMessageReceived(data : MessageRawData) {
        console.log(`ChatScreen.onMessageReceived; message=${data.message}`)
        addNewMessageToAnimationQueue({
            id: Date.now().toString(),
            contentStr: data.message,
            status: ChatMessageStatus.ReceivedFromRemoteHost,
            timeSent: data.timeSent
        })
    }

    function onMessageDelivered(id : string) {
        const msg = allChatChannelsData[connection].messages.find(msg => msg.id == id)
        console.log(`onMessageDelivered id=${id}`)
        if(msg)  {
            msg.status = ChatMessageStatus.Delivered
        }
        else
        {
            console.log("Failed to find message")
        }
        
        forceUpdate()
    }

    /**
     * Called whenever a new chat bubble is drawn to screen. Checks whether an there is an animation to start, and starts it if needed.
     */
    function onChatBubbleLayout() {
        console.log(`onChatBubbleLayout (${mostRecentChatHeight})`)
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

    console.log(`Rerender. menuPosition=${menuPosition.current.x},${menuPosition.current.y}`)

    return (
        <View style={styles.chatScreen}>
            {allChatChannelsData[connection] &&
                <Animated.View style={{ transform: [{ translateY: scrollOffset }] }}>
                    <FlatList
                        data={allChatChannelsData[connection].messages}
                        renderItem={({ item }) => <ChatBubble {...item} onLayout={onChatBubbleLayout} />}
                        keyExtractor={item => item.id}
                        inverted={true}
                        ref={flatListRef}
                    />
                </Animated.View>}
            <View style={styles.footer}>
                <View style={styles.textInputContainer}>
                    <TextInput
                        value={inputText}
                        onChangeText={text => setInputText(text)}
                        style={styles.textInput}
                        dense
                    />
                    <IconButton
                        icon="send"
                        iconColor={'#5dade2'}
                        size={20}
                        onPress={() => sendMessage(inputText)}
                    />
                </View>
            </View>
            {/* Invisible chat bubble is used to measure the exact height of new chat bubbles before they are added to the screen. */}
            {incomingMessageQueue_premeasurement.length > 0 &&
                <ChatBubbleInvisible contentStr={incomingMessageQueue_premeasurement[0].contentStr} viewRef={invisibleChatBubbleRef} />}
            <ChatChannelElipsisMenu
                visible={isElipsisMenuOpen}
                onDismiss={closeElipsisMenu}
                anchor={menuPosition.current}
                channelId={connection}
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