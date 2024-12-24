import { io as ClientSocket, Socket } from 'socket.io-client';
import { DefaultEventsMap } from 'socket.io';
import { ToastAndroid } from 'react-native';

import { onMessageReceivedCallbacks, onMessageDeliveredCallbacks } from './screens/ChatScreen';
import storage from './Storage';

export type NetworkSocket = Socket<DefaultEventsMap, DefaultEventsMap>

export const networkSocketStatesByAddress: Record<string, NetworkSocketState> = {}
let pendingMessages = [] as PendingMessage[];

interface PendingMessage {
    address: string,
    data: MessageRawData,
    /**Unique identifier that corresponds to an entry in the Chat History for this address.*/
    id: string,
    /**The last time the program tried to send the message.*/
    timeLastSent: number,
    receivedAndAcknowledged: boolean
}

interface NetworkSocketState {
    socket: NetworkSocket,
    status: SocketStatus
}

export enum SocketStatus {
    Disconnected,
    Connected,
    Connecting,
    ConnectionError
}

function handleNetworkError(error: Error) {
    ToastAndroid.show(error.toString(), ToastAndroid.LONG)
}

export interface ConnectToRemoteHostCallbacks {
    onConnect?: () => void,
    onMessage?: (data: MessageRawData) => void,
    onError?: (error: Error) => void
}

export interface MessageRawData {
    message: string,
    /**The time when the user issued the send command.*/
    timeSent: number
}

export function connectToRemoteHost(address: string, callbacks: ConnectToRemoteHostCallbacks)
    : Socket<DefaultEventsMap, DefaultEventsMap> {
    const clientSocket = ClientSocket(address, {
        autoConnect: false
    });

    console.log(`connectToRemoteHost`)
    networkSocketStatesByAddress[address] = {
        socket: clientSocket,
        status: SocketStatus.Connecting
    };
    clientSocket.on("connect", () => {
        networkSocketStatesByAddress[address].status = SocketStatus.Connected
        if (callbacks.onConnect) callbacks.onConnect();
        attemptToSendQueuedMessages()
    })
    clientSocket.on("message", (data: MessageRawData, callback) => {
        console.log(`onNetworkMessageReceived; message=${data.message}`)
        if (callbacks.onMessage) callbacks.onMessage(data);
        if (onMessageReceivedCallbacks[address]) onMessageReceivedCallbacks[address](data);
        callback('ACK')
    })
    clientSocket.io.on("error", (error: Error) => {
        networkSocketStatesByAddress[address].status = SocketStatus.ConnectionError //TODO: Only do this for certain errors?
        if (callbacks.onError) callbacks.onError(error);
        handleNetworkError(error)

        attemptToSendQueuedMessages()
    });

    clientSocket.connect()
    return clientSocket;
}

export function disconnectFromHost(address: string): boolean {
    const socketState = networkSocketStatesByAddress[address]
    if (socketState) {
        socketState.socket.disconnect()
        socketState.status = SocketStatus.Disconnected
        attemptToSendQueuedMessages()
        return true
    }
    else {
        ToastAndroid.show(`No socket for address ${address}`, ToastAndroid.SHORT)
        return false
    }
}

export function getSocketStatus(address: string) {
    if (networkSocketStatesByAddress[address]) {
        return networkSocketStatesByAddress[address].status
    }
    return SocketStatus.Disconnected
}

export function isConnectedToRemoteHost(address: string, includePending: boolean = true) {
    if (networkSocketStatesByAddress[address]) {
        return networkSocketStatesByAddress[address].status == SocketStatus.Connected //TODO: Should this use the "official" status or the socket status?
    }
    return false
}

export function enqueueOutboundMessage(address: string, data: MessageRawData, id: string) {
    pendingMessages.push({
        address,
        data,
        id,
        timeLastSent: -1,
        receivedAndAcknowledged: false
    })
    //console.log(`enqueueOutboundMessage; queue.newlength=${pendingMessages.length}`)
    attemptToSendQueuedMessages()
}

export function dispatchPendingMessage(pendingMsg: PendingMessage) {
    //console.log(`dispatchPendingMessage: ${pendingMsg.data.message}`)
    pendingMsg.timeLastSent = Date.now()

    const socketData = networkSocketStatesByAddress[pendingMsg.address]
    if (socketData && socketData.status == SocketStatus.Connected) {
        socketData.socket.emit("message", pendingMsg.data, (response: any) => {
            acknowledgeMessageReceipt(pendingMsg)
        })
    }
}

function acknowledgeMessageReceipt(pendingMsg: PendingMessage) {
    pendingMsg.receivedAndAcknowledged = true
    onMessageDeliveredCallbacks[pendingMsg.address](pendingMsg.id)
    
    storage.save({
        key: 'pendingMessages',
        data: pendingMessages
    })
}

const SEND_RETRY_DELAY_MS = 500
function attemptToSendQueuedMessages() {
    //console.log(`attemptToSendQueuedMessages; queue.length=${pendingMessages.length}`)
    const newQueue = [] as PendingMessage[]
    pendingMessages.forEach(pendingMsg => {
        //console.log(`${pendingMsg.data.message}; lastSent=${pendingMsg.timeLastSent}; ACK=${pendingMsg.receivedAndAcknowledged}`)
        if (pendingMsg.receivedAndAcknowledged) return;
        if (Date.now() - pendingMsg.timeLastSent > SEND_RETRY_DELAY_MS || pendingMsg.timeLastSent < 0) {
            dispatchPendingMessage(pendingMsg)
        }
        newQueue.push(pendingMsg)
    })
    pendingMessages = newQueue

    storage.save({
        key: 'pendingMessages',
        data: pendingMessages
    })

    console.log(`Attempt Finished; queue.newlength=${pendingMessages.length}`)
}

export function loadPersistentNetworkData() {
    storage.load({
        key: 'pendingMessages'
    }).then(value => {
        pendingMessages = value
        console.log(`Loaded ${pendingMessages.length} pending messages`)
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
                ToastAndroid.show(err.toString(), ToastAndroid.LONG)
        }
    });
}

export function clearPendingMessagesToHost(address: string) {
    pendingMessages = pendingMessages.filter(pendingMsg => pendingMsg.address != address)
    storage.save({
        key: 'pendingMessages',
        data: pendingMessages
    })
}