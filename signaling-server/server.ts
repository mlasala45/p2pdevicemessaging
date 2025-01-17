import { Server, Socket } from 'socket.io'
var http = require('http');
import { AddressInfo } from 'net'
import { hasSubscribers } from 'diagnostics_channel';

const LINE_BREAK = "\x1b[32m~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\x1b[0m"
console.log(LINE_BREAK)
console.log("\x1b[32mP2P Messaging App - Signaling Server v1.0.0\x1b[0m")
console.log("\x1b[32mCreated by Micah LaSala, Jan 2025\x1b[0m")
console.log(LINE_BREAK)

const httpServer = http.createServer();
httpServer.listen(3000, '0.0.0.0', () => { onServerStartedListening() })

const server = new Server(httpServer, {
    cors: {
        origin: "*",  // Allow all origins (you can also specify specific origins, e.g., "http://example.com")
        methods: ["GET", "POST"],  // Allow GET and POST methods
        credentials: true,  // Enable credentials (cookies, authorization headers, etc.)
    }
})

interface DeviceIdentifier {
    address: string,
    username: string
}

interface PairingState {
    otherPeer: DeviceIdentifier,
    pairingStartedTime: Date
}

const HANDSHAKE_TIMEOUT = 10 * 1000
class ConnectedHostData {
    socket: Socket
    username: string
    compositeName: string
    pairingState: PairingState | null
    pendingConnectionRequests: DeviceIdentifier[] | undefined
    rejectedConnectionRequests: DeviceIdentifier[] | undefined

    onPairingStarted(peerId: DeviceIdentifier) {
        this.pairingState = {
            otherPeer: peerId,
            pairingStartedTime: new Date()
        }
    }

    onPairingFinished() {
        this.pairingState = null
    }

    isBusyPairing() {
        if (!this.pairingState) return false

        const timeElapsed = Date.now() - this.pairingState.pairingStartedTime.getTime()
        if (timeElapsed > HANDSHAKE_TIMEOUT) {
            this.pairingState = null
            return false
        }
        return true
    }

    getIdentifier(): DeviceIdentifier {
        return { address: this.socket.handshake.address, username: this.username }
    }

    matchesIdentifier(value: DeviceIdentifier): boolean {
        if (this.socket.handshake.address != value.address) return false
        if (value.username == '' || value.username == '*') return true
        return this.username == value.username
    }

    isPeerBlacklisted(peerId: DeviceIdentifier) {
        console.log(`[${this.compositeName}]: Is host ${peerId.username}@${peerId.address} blacklisted?`)
        if (!this.rejectedConnectionRequests) this.rejectedConnectionRequests = []
        
        console.log(`Blacklist: (N=${this.rejectedConnectionRequests.length})`)
        this.rejectedConnectionRequests.forEach(samplePeerId => console.log(`${samplePeerId.username}@${samplePeerId.address}`))

        const matchIndex = this.rejectedConnectionRequests.findIndex(samplePeerId => deviceIdsMatch(peerId, samplePeerId))
        console.log(`matchIndex=${matchIndex}`)
        if(matchIndex >= 0) return true;
        return false;
    }
}

interface ConnectedAddressData extends Record<string, ConnectedHostData> { }

const allConnectedHosts = {} as Record<string, ConnectedAddressData>

function terminateHandshake(a: DeviceIdentifier, b: DeviceIdentifier) {
    try {
        const hostData_a = allConnectedHosts[a.address][a.username]
        const hostData_b = allConnectedHosts[b.address][b.username]
        hostData_a.onPairingFinished()
        hostData_b.onPairingFinished()
    } catch (error) {
        console.warn(`Error terminating handshake.`)
        console.warn(error.message)
    }
}

function getHost(id: DeviceIdentifier | undefined) {
    if (id && allConnectedHosts[id.address]) {
        const hostsByUser = allConnectedHosts[id.address]
        if (id.username == '*' || id.username == '') {
            const values = Object.values(hostsByUser)
            if (values.length > 0) {
                return values[0]
            }
            else {
                return undefined
            }
        }
        return allConnectedHosts[id.address][id.username]
    }
    return null
}

function relayAllConnectionRequestsFromHost(hostData: ConnectedHostData) {
    hostData.pendingConnectionRequests?.forEach(requestedPeer => {
        const match = getHost(requestedPeer)
        if (match) {
            tryReportRequestedConnection(match, hostData)
        }
    })
}

function retractAllConnectionRequestsFromHost(hostData: ConnectedHostData) {
    hostData.pendingConnectionRequests?.forEach(requestedPeer => {
        const match = getHost(requestedPeer)
        if (match) {
            if (!hostData.rejectedConnectionRequests) hostData.rejectedConnectionRequests = []
            const matchIndex = hostData.rejectedConnectionRequests.findIndex(samplePeerId => deviceIdsMatch(requestedPeer, samplePeerId))
            if (matchIndex < 0) {
                console.log(`To [${match.compositeName}]: [${hostData.compositeName}] withdrew its connection request.`)
                match.socket.emit('cancel-connection-request', {
                    sender: hostData.getIdentifier()
                })
            }
        }
    })
}

function tryReportRequestedConnection(recipientHostData: ConnectedHostData, requesterHostData: ConnectedHostData) {
    console.log(tryReportRequestedConnection, recipientHostData.compositeName, requesterHostData.compositeName)
    const requesterId = requesterHostData.getIdentifier()
    //Check whether the peer has previously rejected the requester
    if (!recipientHostData.rejectedConnectionRequests) recipientHostData.rejectedConnectionRequests = []
    const matchIndex = recipientHostData.rejectedConnectionRequests.findIndex(samplePeerId => deviceIdsMatch(requesterId, samplePeerId))
    console.log("matchIndex", matchIndex)
    if (matchIndex < 0) {
        console.log(`To [${recipientHostData.compositeName}]: [${requesterHostData.compositeName}] wants to connect to you.`)
        recipientHostData.socket.emit('request-connection', {
            sender: requesterId
        })
    }
}

function checkAllConnectedHostsForRequestsToCertainHost(hostData: ConnectedHostData) {
    console.log(`[${hostData.compositeName}] check-for-existing-requests`)
    Object.values(allConnectedHosts).forEach(hostsByUser => {
        Object.values(hostsByUser).forEach(otherHostData => {
            if (otherHostData == hostData) return

            console.log(`-> ${otherHostData.compositeName}; Num saved requests: ${otherHostData.pendingConnectionRequests ? otherHostData.pendingConnectionRequests.length : 0}`)
            otherHostData.pendingConnectionRequests?.forEach(requestedPeer => {
                console.log(`-> -> ${requestedPeer.username}@${requestedPeer.address}; match=${hostData.matchesIdentifier(requestedPeer)}`)
                if (hostData.matchesIdentifier(requestedPeer)) {
                    tryReportRequestedConnection(hostData, otherHostData)
                }
            })
        })
    })
}

function deviceIdsMatch(a: DeviceIdentifier, b: DeviceIdentifier) {
    if (a.address != b.address) return false
    if (a.username == '*' || a.username == '' || b.username == '*' || b.username == '') return true;
    return a.username == b.username;
}

server.on("connection", (socket) => {
    const socketAddress = socket.handshake.address
    const { username } = socket.handshake.query;
    const compositeName = `${username}@${socketAddress}`
    const hostData = new ConnectedHostData()
    hostData.socket = socket
    hostData.username = username as string
    hostData.compositeName = compositeName
    hostData.pairingState = null
    console.log(`[${hostData.compositeName}] connected`)

    if (!allConnectedHosts[socketAddress]) allConnectedHosts[socketAddress] = {}
    allConnectedHosts[socketAddress][username as string] = hostData

    checkAllConnectedHostsForRequestsToCertainHost(hostData)

    socket.on('sync-connection-requests', (requests: DeviceIdentifier[]) => {
        console.log(`[${hostData.compositeName}] sync-connection-requests: N=${requests.length}}`)
        hostData.pendingConnectionRequests = requests

        //Remove any blacklist entries from peers being requested
        if (hostData.rejectedConnectionRequests) {
            requests.forEach(requestedPeerId => {
                hostData.rejectedConnectionRequests = hostData.rejectedConnectionRequests!.filter(peerId => !deviceIdsMatch(peerId, requestedPeerId))
            })
        }

        relayAllConnectionRequestsFromHost(hostData)
    })

    socket.on('cancel-connection-request', ({ peerId }: { peerId: DeviceIdentifier }) => {
        if(!peerId) return;
        console.log(`[${hostData.compositeName}] cancel-connection-request: peerId=${peerId.username}@${peerId.address}`)
        const match = getHost(peerId)
        if (match) {
            console.log(`To [${match.compositeName}]: [${hostData.compositeName}] withdrew its connection request.`)
            match.socket.emit('cancel-connection-request', {
                sender: hostData.getIdentifier()
            })

            hostData.pendingConnectionRequests = hostData.pendingConnectionRequests?.filter(requestedPeer => !deviceIdsMatch(requestedPeer, peerId))
        }
    })

    socket.on('accept-connection-request', ({ peerId }: { peerId: DeviceIdentifier }) => {
        if(!peerId) return;
        console.log(`[${hostData.compositeName}] accept-connection-request: peerId=${peerId.username}@${peerId.address}`)
        const match = getHost(peerId)
        if (match) {
            const acceptingPeer = hostData.getIdentifier()
            const matchIndex = match.pendingConnectionRequests ? match.pendingConnectionRequests.findIndex(requestedPeer => deviceIdsMatch(requestedPeer, acceptingPeer)) : -1
            if (matchIndex < 0) {
                //Connection was not requested
                socket.emit('cancel-connection-request', { peerId })
            }
            else {
                socket.emit('start-ice-handshake', {
                    peerAddress: peerId.address,
                    peerUsername: peerId.username,
                    shouldSendOffer: true
                })
                match.socket.emit('start-ice-handshake', {
                    peerAddress: acceptingPeer.address,
                    peerUsername: acceptingPeer.username,
                    shouldSendOffer: false
                })

                hostData.onPairingStarted({
                    address: peerId.address,
                    username: peerId.username
                })
                match.onPairingStarted({
                    address: acceptingPeer.address,
                    username: acceptingPeer.username
                })
                console.log(`--> Starting Handshake`)
            }
        }
    })

    socket.on('reject-connection-request', ({ peerId }: { peerId: DeviceIdentifier }) => {
        if(!peerId) return;
        console.log(`[${hostData.compositeName}] reject-connection-request: peerId=${peerId.username}@${peerId.address}`)
        if (!hostData.rejectedConnectionRequests) hostData.rejectedConnectionRequests = []
        const matchIndex = hostData.rejectedConnectionRequests.findIndex(samplePeerId => deviceIdsMatch(peerId, samplePeerId))
        if (matchIndex < 0) {
            console.log('Adding blacklist record')
            hostData.rejectedConnectionRequests.push(peerId)
        }
    })

    socket.on('reconnect-existing-connection', async ({ peerId }: { peerId: DeviceIdentifier }) => {
        if(!peerId) return;
        console.log(`[${hostData.compositeName}] wants to reconnect to ${peerId.username}@${peerId.address}`)

        const hostId =  hostData.getIdentifier()
        const peerHostData = getHost(peerId)
        if (peerHostData) {
            if(!peerHostData.isPeerBlacklisted(hostId)) {
                //Receiving peer has not rejected the sender
                const response = await peerHostData.socket.emitWithAck('reconnect-existing-connection', { sender: hostId })
                if (response == 'approve') {
                    socket.emit('start-ice-handshake', {
                        peerAddress: peerId.address,
                        peerUsername: peerId.username,
                        shouldSendOffer: false
                    })

                    hostData.onPairingStarted(peerId)
                    peerHostData.onPairingStarted(hostId)
                }
                else
                {
                    //The receiving peer is treating it as a new connection request that needs approval
                    hostData.pendingConnectionRequests?.push(peerId)
                }               
            }
        }
    })

    //Received by remote peer when a connection request is first issued.
    socket.on('request-connection', (peerAddress: string, peerUsername: string) => {
        const peerCompositeName = `${peerUsername || '*'}@${peerAddress}`
        console.log(`[${hostData.compositeName}] requested connection to ${peerCompositeName}`)

        let matchingRecord
        if (allConnectedHosts[peerAddress]) {
            if (peerUsername) {
                matchingRecord = allConnectedHosts[peerAddress][peerUsername]
            }
            else {
                matchingRecord = Object.values(allConnectedHosts[peerAddress])[0]
            }
        }
        /*if (matchingRecord) {
            if (matchingRecord.currentlyPairingWith) {
                console.log(`--> Peer busy`)
                socket.emit('peer-busy', peerAddress, peerUsername)
            }
            else {
                
                socket.emit('start-ice-handshake', peerAddress, matchingRecord.username, true) //Original requester an 'offer' and waits for an 'answer' and candidates
                matchingRecord.socket.emit('start-ice-handshake', socketAddress, hostData.username, false) //Peer starts listening for offer and candidates
            }
        }*/
        else {
            console.log(`--> Unknown Peer`)
            socket.emit('unknown-peer', peerAddress, peerUsername)
        }
    })

    socket.on('ice-success', () => {
        if (hostData.pairingState) {
            const otherPeerId = hostData.pairingState.otherPeer
            console.log(`Pairing succeeded between`, hostData.compositeName, "and", `${otherPeerId.username || ''}@${otherPeerId.address}`)
            terminateHandshake(
                {
                    address: socketAddress,
                    username: hostData.username
                },
                otherPeerId
            )
        }
    })

    socket.on('change-username', (newUsername: string) => {
        const prevCompositeName = hostData.compositeName
        const newCompositeName = `${newUsername}@${socketAddress}`
        if (allConnectedHosts[socketAddress]) {
            if (allConnectedHosts[socketAddress][newUsername]) {
                //Name is already taken
                socket.emit('err-username-reserved', newUsername)
                console.log(`[${prevCompositeName}] failed to change username to reserved: '${newUsername}'`)
            }
            else {
                retractAllConnectionRequestsFromHost(hostData)

                delete allConnectedHosts[socketAddress][hostData.username]

                hostData.username = newUsername
                hostData.compositeName = newCompositeName
                allConnectedHosts[socketAddress][newUsername] = hostData

                //Reissue connection requests under new username
                relayAllConnectionRequestsFromHost(hostData)

                socket.emit('username-changed', newUsername)
                console.log(`[${prevCompositeName}] changed username to '${newUsername}'`)
            }
        }
        else {
            console.warn(`MAJOR: Data for open socket at address ${socketAddress} is missing!`)
        }
    })

    socket.on('disconnect', function () {
        //TODO: Abort ongoing handshakes

        retractAllConnectionRequestsFromHost(hostData)

        console.log(`[${hostData.compositeName}] disconnected`)
        delete allConnectedHosts[socketAddress][hostData.username]
    });

    socket.on('ice-candidate', (candidateData) => {
        console.log(`[${hostData.compositeName}] <ice-candidate> : ${Object.keys(candidateData)}`)
        getHost(hostData.pairingState?.otherPeer)?.socket.emit('ice-candidate', candidateData)
    })

    socket.on('ice-offer', (offerData) => {
        console.log(`[${hostData.compositeName}] <ice-offer> : ${Object.keys(offerData)}`)
        getHost(hostData.pairingState?.otherPeer)?.socket.emit('ice-offer', offerData)
    })

    socket.on('ice-answer', (answerData) => {
        console.log(`[${hostData.compositeName}] <ice-answer> : ${Object.keys(answerData)}`)
        getHost(hostData.pairingState?.otherPeer)?.socket.emit('ice-answer', answerData)
    })
});


function onServerStartedListening() {
    const addressInfo = server.httpServer.address();

    function isAddressInfo(addressInfo: AddressInfo | string | null): addressInfo is AddressInfo {
        return (addressInfo as AddressInfo) != undefined;
    }
    
    if (isAddressInfo(addressInfo)) {
        console.log(`Opened server on ${addressInfo.address}:${addressInfo.port}`)
    }
    else {
        console.log(`Opened server on ${addressInfo}`)
    }
}