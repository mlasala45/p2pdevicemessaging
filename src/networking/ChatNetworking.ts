import Toast from "react-native-toast-message";
import { sendConnectionRequest_signalServer, SocketStatus } from "./P2PNetworking";
import { chatScreenNetworkCallbacks } from "../screens/ChatScreen";
import storage from "../Storage";
import { DeviceIdentifier } from "./DeviceIdentifier";
import { allPeerConnections, checkPeerConnectionStatus } from "./P2PNetworking";
import { registerEventHandler } from "../util/Events";
import { EventData_onClearChatHistory, Events } from "../events";

let pendingOutboundMessages = [] as PendingMessage[];
let pendingInboundMessages : { channelID : DeviceIdentifier, data : MessageRawData }[] = []

interface PendingMessage {
    channelId: DeviceIdentifier,
    data: MessageRawData,
    /**Unique identifier that corresponds to an entry in the Chat History for this address.*/
    id: string,
    /**The last time the program tried to send the message.*/
    timeLastSent: number,
    receivedAndAcknowledged: boolean
}

export interface MessageRawData {
    message: string,
    /**The time when the user issued the send command.*/
    timeSent: number
}

export function onMessageReceived(channelID : DeviceIdentifier, data : MessageRawData) {
    pendingInboundMessages.push({channelID, data})
    attemptToProcessReceivedMessages()
}

export function connectExistingChatChannel(channelId: DeviceIdentifier) {
    sendConnectionRequest_signalServer(channelId.address, channelId.username)
}

/** Loads outbound messages that were pending at last save. */
export function loadPersistentNetworkData() {
    storage.load({
        key: 'pendingMessages'
    }).then(value => {
        pendingOutboundMessages = value
        console.log(`Loaded ${pendingOutboundMessages.length} pending messages`)
        //TODO: Risk of this occurring late and overwriting messages sent before it loads
    }).catch((err) => {
        switch (err.name) {
            case 'NotFoundError':
                storage.save({
                    key: 'pendingMessages',
                    data: []
                })
                break
            default:
                console.log("Error loading storage/pendingMessages")
                console.warn(err.message)
                Toast.show({
                    type: 'error',
                    text1: `Error loading storage/pendingMessages:\n${err.message}`,
                    visibilityTime: 3000,
                    autoHide: false
                })
        }
    });
}

export function enqueueOutboundMessage(channelId: DeviceIdentifier, data: MessageRawData, id: string) {
    pendingOutboundMessages.push({
        channelId,
        data,
        id,
        timeLastSent: -1,
        receivedAndAcknowledged: false
    })
    //console.log(`enqueueOutboundMessage; queue.newlength=${pendingMessages.length}`)
    attemptToSendQueuedMessages()
}

const SEND_RETRY_DELAY_MS = 500
export function attemptToSendQueuedMessages() {
    //console.log(`attemptToSendQueuedMessages; queue.length=${pendingMessages.length}`)
    const newQueue = [] as PendingMessage[]
    pendingOutboundMessages.forEach(pendingMsg => {
        //console.log(`${pendingMsg.data.message}; lastSent=${pendingMsg.timeLastSent}; ACK=${pendingMsg.receivedAndAcknowledged}`)
        if (pendingMsg.receivedAndAcknowledged) return;
        if (Date.now() - pendingMsg.timeLastSent > SEND_RETRY_DELAY_MS || pendingMsg.timeLastSent < 0) {
            dispatchPendingMessage(pendingMsg)
        }
        newQueue.push(pendingMsg)
    })
    pendingOutboundMessages = newQueue
    onPendingMessageQueueModified()

    //console.log(`attemptToSendQueuedMessages Finished; queue.newlength=${pendingMessages.length}`)
}

export function attemptToProcessReceivedMessages() {
    const newQueue : typeof pendingInboundMessages = []
    pendingInboundMessages.forEach(pendingMsg => {
        const callbacks = chatScreenNetworkCallbacks.get(pendingMsg.channelID)
        if(callbacks) {
            callbacks.onMessageReceived(pendingMsg.data)
        }
        else
        {
            newQueue.push(pendingMsg)
        }
    })
    pendingInboundMessages = newQueue
}

/**Saves changes to persistent storage. */
function onPendingMessageQueueModified() {
    storage.save({
        key: 'pendingMessages',
        data: pendingOutboundMessages
    })
}


export function dispatchPendingMessage(pendingMsg: PendingMessage) {
    //console.log(`dispatchPendingMessage: ${pendingMsg.data.message}`)
    pendingMsg.timeLastSent = Date.now()

    const connectionStatus = checkPeerConnectionStatus(pendingMsg.channelId)
    //console.log("Status:", SocketStatus[connectionStatus])
    if (connectionStatus == SocketStatus.Connected) {
        //console.log("dispatch went to data channel")
        allPeerConnections.get(pendingMsg.channelId)!.dataChannel_chat?.send(JSON.stringify({
            type: "chatMessage",
            content: pendingMsg.data.message,
            msgId: pendingMsg.id,
            timeSent: pendingMsg.data.timeSent
        }))
    }
}


export function acknowledgeMessageReceipt(msgId: string) {
    const pendingMsg = pendingOutboundMessages.find(data => data.id == msgId)

    if (!pendingMsg) {
        console.warn(`Received ACK for message not present in queue: ${msgId}`)
        return
    }

    pendingMsg.receivedAndAcknowledged = true
    chatScreenNetworkCallbacks.get(pendingMsg.channelId)?.onMessageDelivered(pendingMsg.id)

    onPendingMessageQueueModified()
}

export function isMessagePending(msgId: string) {
    return pendingOutboundMessages.findIndex(pendingMsg => pendingMsg.id == msgId) > -1
}

export function clearPendingMessagesToHost(channelId: DeviceIdentifier) {
    pendingOutboundMessages = pendingOutboundMessages.filter(pendingMsg => pendingMsg.channelId != channelId)
    onPendingMessageQueueModified()
}

registerEventHandler(Events.onClearChatHistory, "chatNetworking", (e : EventData_onClearChatHistory) => {
    pendingOutboundMessages = pendingOutboundMessages.filter(pendingMsg => pendingMsg.channelId != e.channelId)
    onPendingMessageQueueModified()
})