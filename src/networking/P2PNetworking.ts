import { io as ClientSocket, Socket } from 'socket.io-client';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices } from 'react-native-webrtc-web-shim';
import Toast from 'react-native-toast-message';
import { allChatChannelsDetailsData, createNewChannel } from '../ChatData';
import ArrayDictionary from '../util/ArrayDictionary';

import { DeviceIdentifier, KeyFunctions_DeviceIdentifier, toString } from './DeviceIdentifier';
import { forceRerenderApp } from '../App';
import { chatScreenNetworkCallbacks } from '../screens/ChatScreen';
import RTCDataChannel from 'react-native-webrtc/lib/typescript/RTCDataChannel';
import { RTCErrorEvent } from 'react-native-webrtc';
import { acknowledgeMessageReceipt, onMessageReceived } from './ChatNetworking';

export interface PublicNetworkAddress {
  ipv4: string,
  port: number
}

export enum SocketStatus {
  Disconnected,
  Connected,
  Connecting,
  ConnectionError
}

function parseCandidateStr(candidateStr: string) {
  const [foundationStr, componentCode, protocol, priorityStr, ip, port, _, type] = candidateStr.replace('candidate:', '').split(' ');
  const component = componentCode == '1' ? "rtp" : "rtcp"
  return {
    foundation: parseInt(foundationStr),
    component,
    protocol,
    priority: parseInt(priorityStr),
    ip,
    port: parseInt(port),
    type
  }
}

function isValidIPv4(ip: string): boolean {
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;

  if (!ipv4Pattern.test(ip)) {
    return false;
  }

  const octets = ip.split('.');
  return octets.every(octet => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255;
  });
}

const DEFAULT_P2P_PORT = 3000
export function getPublicAddress(port = DEFAULT_P2P_PORT): Promise<PublicNetworkAddress> {
  return new Promise((resolve, reject) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Google's free STUN server
      ],
    };

    const peerConnection = new RTCPeerConnection(configuration);

    //Event Listeners

    peerConnection.addEventListener('icecandidate', (event: any) => {
      if (event.candidate) {
        //console.log(`icecandidate ${event.candidate.candidate}`)
        const candidate = parseCandidateStr(event.candidate.candidate);
        if (candidate.type == 'srflx') {
          if (!isValidIPv4(candidate.ip)) return
          resolve({ ipv4: candidate.ip, port: candidate.port });
        }
        else {
          //console.log(`candidate ${candidate.type} ${candidate.ip}:${candidate.port}`)
        }
      }
    });

    peerConnection.addEventListener('icecandidateerror', (event: any) => {
      //console.log(`icecandidateerror ${event}`)
    });

    peerConnection.createDataChannel('ping')

    const sessionConstraints = {
    }
    peerConnection.createOffer(sessionConstraints)
      .then((offer: any) => {
        //console.log(`offer sdp=${offer.sdp}`)
        peerConnection.setLocalDescription(offer)
      })
      .catch((err: Error) => reject(err));
  });
}

export function displayNetworkError(error: Error) {
  Toast.show({
    type: 'error',
    text1: error.toString(),
    visibilityTime: 2000
  })
}

export const allPeerConnections = new ArrayDictionary<DeviceIdentifier, P2PConnectionRefs>(KeyFunctions_DeviceIdentifier)
function onPeerConnectionEstablished(refs: P2PConnectionRefs, id: DeviceIdentifier) {
  console.log("onPeerConnectionEstablished", refs, id)

  if (!allChatChannelsDetailsData.containsKey(id)) {
    //Chat channels are created upon successful peer connections that do not already have a channel.
    createNewChannel(id)
  }
  chatScreenNetworkCallbacks.get(id)?.onConnected()
  forceRerenderApp()
}

/** UI updates are handled by onPeerConnectionStateChange. */
function onPeerConnectionTerminated(id: DeviceIdentifier) {
  console.log("onPeerConnectionTerminated")
  checkPeerConnectionStatus(id)
  allPeerConnections.remove(id)
  chatScreenNetworkCallbacks.get(id)?.onDisconnected()
}

interface P2PConnectionRefs {
  id: DeviceIdentifier,
  peerConnection: RTCPeerConnection,
  dataChannel_chat: RTCDataChannel | null,
  /**Updated whenever getPeerConnectionStatus() is called. */
  lastRecordedStatus: SocketStatus
}

let activeHandshakeConnectionRefs: P2PConnectionRefs | null
let activeHandshakePeerId: DeviceIdentifier | null
function startIceHandshake(signallingChannelSocket: Socket, peerDeviceId: DeviceIdentifier, shouldSendOffer: boolean) {
  console.log("startIceHandshake", toString(peerDeviceId), "outgoing=", shouldSendOffer)

  const prevEntry = allPeerConnections.get(peerDeviceId)
  if (prevEntry) {
    prevEntry.peerConnection.close()
    onPeerConnectionTerminated(peerDeviceId)
  }

  const peerConnectionConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ],
  };

  const peerConnection = new RTCPeerConnection(peerConnectionConfiguration);
  const refs: P2PConnectionRefs = {
    id: peerDeviceId,
    peerConnection,
    dataChannel_chat: null,
    lastRecordedStatus: SocketStatus.Connecting
  }
  if (shouldSendOffer) {
    refs.dataChannel_chat = peerConnection.createDataChannel('chat')
    initializeDataChannel(refs, peerDeviceId)
  }
  allPeerConnections.add(refs)

  activeHandshakeConnectionRefs = refs
  activeHandshakePeerId = peerDeviceId
  peerConnection.addEventListener('icecandidate', (event: any) => {
    if (event.candidate) {
      signallingChannelSocket.emit('ice-candidate', event.candidate)
    }
  });

  peerConnection.addEventListener('iceconnectionstatechange', (event: any) => {
    if (peerConnection.iceConnectionState == 'connected' || peerConnection.iceConnectionState == 'completed') {
      activeHandshakeConnectionRefs = null
      activeHandshakePeerId = null
      if (shouldSendOffer) {
        console.log("Established outbound ICE connection!")
        onPeerConnectionEstablished(refs, peerDeviceId)

        signalingServerSocket.emit('ice-success')
      }
      else {
        console.log("Established inbound ICE connection!")
        onPeerConnectionEstablished(refs, peerDeviceId)
      }
    }
    checkPeerConnectionStatus(peerDeviceId)
  })

  peerConnection.addEventListener('connectionstatechange', (event: any) => {
    checkPeerConnectionStatus(peerDeviceId)
  })

  peerConnection.addEventListener('datachannel', (event: any) => {
    refs.dataChannel_chat = event.channel
    initializeDataChannel(refs, peerDeviceId)
  })


  if (shouldSendOffer) {
    const sessionConstraints = {}
    peerConnection.createOffer(sessionConstraints)
      .then((offer: any) => {
        peerConnection.setLocalDescription(offer)
        signallingChannelSocket.emit('ice-offer', offer)
      })
  }
}

/** Initializes event handlers for the data channel */
function initializeDataChannel(refs: P2PConnectionRefs, peerDeviceId: DeviceIdentifier) {
  // @ts-ignore
  refs.dataChannel_chat.addEventListener('message', (event: any) => {
    console.log("message from:", peerDeviceId, "raw:", event.data)
    const msgData = JSON.parse(event.data)

    switch (msgData.type) {
      case "disconnect":
        console.log("Connection closed by remote host", peerDeviceId)
        refs.peerConnection.close()

        //On Close events are handled by the 'iceconnectionstatechange' event handler
        break
      case "chatMessage":
        onMessageReceived(peerDeviceId, {
          message: msgData.content,
          timeSent: msgData.timeSent
        })
        refs.dataChannel_chat?.send(JSON.stringify({
          type: 'ack-chatMessage',
          msgId: msgData.msgId,
          timeSent: Date.now()
        }))
        break
      case "ack-chatMessage":
        acknowledgeMessageReceipt(msgData.msgId)
        break
    }
  })

  const handleStateChange = (event: any) => checkPeerConnectionStatus(peerDeviceId)
  // @ts-ignore
  refs.dataChannel_chat.addEventListener('open', handleStateChange)
  // @ts-ignore
  refs.dataChannel_chat.addEventListener('close', handleStateChange)
  // @ts-ignore
  refs.dataChannel_chat.addEventListener('closing', handleStateChange)

  // @ts-ignore
  refs.dataChannel_chat.addEventListener('error', (event: RTCErrorEvent) => {
    console.warn("Data Channel ERROR:", event.error)
    console.dir(event.error)
  })
}

function onPeerConnectionStateChange(channelId: DeviceIdentifier, prevStatus: SocketStatus, currentStatus: SocketStatus) {
  console.log("onPeerConnectionStateChange", channelId, SocketStatus[prevStatus], "-->", SocketStatus[currentStatus])
  if (currentStatus == prevStatus) return;

  switch (currentStatus) {
    case SocketStatus.Connected:
      Toast.show({
        type: 'success',
        text1: `Connected to ${toString(channelId)}`, //TODO: Use channel name
        visibilityTime: 2000
      })
      break;
    case SocketStatus.Disconnected:
      Toast.show({
        type: 'success',
        text1: `Disconnected from ${toString(channelId)}`, //TODO: Use channel name
        visibilityTime: 2000
      })
      onPeerConnectionTerminated(channelId)
      break;
  }

  chatScreenNetworkCallbacks.get(channelId)?.onConnectionStateChanged(currentStatus)
  forceRerenderApp()
}

interface SignallingMessage {
  type: string,
  content: string
}

function composite(address: string, username: string) {
  return `${username}@${address}`
}

let signalingServerSocket: Socket
export let currentSignalServerUsername: string
export function connectToSignalingServer(address: string, username: string, onSignalSocketStatusChanged: (status: SocketStatus) => void) {
  if (signalingServerSocket) {
    signalingServerSocket.disconnect()
  }

  const socket = ClientSocket(address, {
    autoConnect: false,
    query: { username }
  });

  //Connection Status Events
  //

  socket.on('connect', () => {
    currentSignalServerUsername = username
    onSignalSocketStatusChanged(SocketStatus.Connected)
  })

  socket.on("connect_error", (error) => {
    onSignalSocketStatusChanged(SocketStatus.ConnectionError)
    if (socket.active) {
      console.log(error.message)
      // temporary failure, the socket will automatically try to reconnect
    } else {
      console.log(error.message);
    }

    displayNetworkError(error)

    socket.disconnect()
  });

  socket.on('disconnect', () => {
    onSignalSocketStatusChanged(SocketStatus.Disconnected)
  })

  //Handshake Management Events
  //

  //TODO: Verify that you asked to be connected to this peer
  socket.on('start-ice-handshake', (peerAddress: string, peerUsername: string, shouldSendOffer: boolean) => {
    console.log(`Starting handshake with ${composite(peerAddress, peerUsername)}`)

    answerReceived = false
    iceCandidatesQueue = []
    startIceHandshake(signalingServerSocket, { address: peerAddress, username: peerUsername }, shouldSendOffer)
  })

  socket.on('unknown-peer', (peerAddress: string, peerUsername: string) => {
    console.log(`Server does not recognize ${composite(peerAddress, peerUsername)}`)
  })

  //Ice Handshake Events
  //
  let iceCandidatesQueue: RTCIceCandidate[] = []
  let answerReceived = false
  socket.on('ice-candidate', candidateData => {
    if (!activeHandshakeConnectionRefs) return;

    const iceCandidate = new RTCIceCandidate(candidateData);

    if (answerReceived) {
      activeHandshakeConnectionRefs.peerConnection.addIceCandidate(iceCandidate);
    }
    else {
      iceCandidatesQueue.push(iceCandidate)
    }
  })

  socket.on('ice-offer', async offer => {
    if (!activeHandshakeConnectionRefs) return;

    const activePeerConnection = activeHandshakeConnectionRefs.peerConnection
    await activePeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await activePeerConnection.createAnswer();
    await activePeerConnection.setLocalDescription(answer);
    socket.emit('ice-answer', answer)
  })

  socket.on('ice-answer', answer => {
    if (!activeHandshakeConnectionRefs) return;

    const activePeerConnection = activeHandshakeConnectionRefs.peerConnection
    activePeerConnection.setRemoteDescription(new RTCSessionDescription(answer));

    answerReceived = true
    //Small possibility of an ice candidate arriving at this point and being dropped 
    iceCandidatesQueue.forEach(iceCandidate => activePeerConnection.addIceCandidate(iceCandidate))
  })

  //Username events
  //

  socket.on('username-changed', (username: string) => {
    Toast.show({
      type: 'success',
      text1: `Signal server username changed to '${username}'`,
      visibilityTime: 3000
    })
    currentSignalServerUsername = username
    onSignalSocketStatusChanged(SocketStatus.Connected)
  })

  socket.on('err-username-reserved', (username: string) => {
    Toast.show({
      type: 'error',
      text1: `Signal server username already in use: '${username}'`,
      visibilityTime: 3000
    })
  })

  socket.connect()
  onSignalSocketStatusChanged(SocketStatus.Connecting)
  signalingServerSocket = socket
}

export function updateSignalServerUsername(username: string) {
  signalingServerSocket.emit('change-username', username)
}

export function sendConnectionRequest_signalServer(peerAddress: string, peerUsername: string) {
  if (signalingServerSocket && signalingServerSocket.connected) {
    signalingServerSocket.emit('request-connection', peerAddress, peerUsername)
  }
  else {
    Toast.show({
      type: 'error',
      text1: 'Not Connected to Signal Server'
    })
  }
}

export function disconnectPeerConnection(deviceId: DeviceIdentifier) {
  console.log("disconnectPeerConnection")
  const refs = allPeerConnections.get(deviceId)
  if (refs) {
    const msg = JSON.stringify({
      type: 'disconnect',
      timeSent: Date.now()
    })
    refs.dataChannel_chat?.send(msg)
    refs.peerConnection.close()
    onPeerConnectionTerminated(deviceId)
  }
}

export function isConnectedToSignalServer() {
  return signalingServerSocket && signalingServerSocket.connected
}

/** Returns the status of the connection. Triggers onPeerConnectionStateChange() if the state has changed since the last time this was called. */
export function checkPeerConnectionStatus(channelId: DeviceIdentifier): SocketStatus {
  const refs = allPeerConnections.get(channelId)
  //console.log("checkPeerConnectionStatus")
  //console.dir(refs)
  const status = (() => {
    if (refs) {
      if (activeHandshakePeerId == channelId) return SocketStatus.Connecting

      const connectionState = refs.peerConnection.connectionState
      const readyState = refs.dataChannel_chat?.readyState

      //TODO: Trigger rerender on data channel state change

      //console.log(connectionState,readyState)
      switch (connectionState) {
        case "connecting":
          return SocketStatus.Connecting
        case "connected":
        case "disconnected": //For ICE, "disconnected" means it was unexpectedly disconnected, and will attempt to reconnect
          if (readyState == "connecting" || readyState == undefined) return SocketStatus.Connecting
          if (readyState == "open") return SocketStatus.Connected
          return SocketStatus.ConnectionError
        case "failed":
        case "closed":
          return SocketStatus.Disconnected
      }
    }
  })()

  //console.log(status && SocketStatus[status])
  if (refs) {
    if (refs.lastRecordedStatus != status) {
      const prevStatus = refs.lastRecordedStatus
      refs.lastRecordedStatus = status! //Must be updated before callback to avoid cyclical calls
      onPeerConnectionStateChange(channelId, prevStatus, status!)
    }
    return status!
  }
  else {
    //Should only happen for connections that haven't been touched since startup
    return SocketStatus.Disconnected
  }

  //TODO: Handle connection errors
}