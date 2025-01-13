import { Server, Socket } from 'socket.io'
var http = require('http');
import { AddressInfo } from 'net'

const httpServer = http.createServer();
httpServer.listen(3000, '0.0.0.0')

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
        return allConnectedHosts[id.address][id.username]
    }
    return null
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
        if (matchingRecord) {
            if (matchingRecord.currentlyPairingWith) {
                console.log(`--> Peer busy`)
                socket.emit('peer-busy', peerAddress, peerUsername)
            }
            else {
                hostData.onPairingStarted({
                    address: peerAddress,
                    username: matchingRecord.username
                })
                matchingRecord.onPairingStarted({
                    address: socketAddress,
                    username: hostData.username
                })
                console.log(`--> Starting Handshake`)
                socket.emit('start-ice-handshake', peerAddress, matchingRecord.username, true) //Original requester an 'offer' and waits for an 'answer' and candidates
                matchingRecord.socket.emit('start-ice-handshake', socketAddress, hostData.username, false) //Peer starts listening for offer and candidates
            }
        }
        else {
            console.log(`--> Unknown Peer`)
            socket.emit('unknown-peer', peerAddress, peerUsername)
        }
    })

    socket.on('ice-success', () => {
        if (hostData.pairingState) {
            const otherPeerId = hostData.pairingState.otherPeer
            console.log(`Pairing succeeded between`,hostData.compositeName,"and",`${otherPeerId.username || ''}@${otherPeerId.address}`)
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
                delete allConnectedHosts[socketAddress][hostData.username]

                hostData.username = newUsername
                hostData.compositeName = newCompositeName
                allConnectedHosts[socketAddress][newUsername] = hostData

                socket.emit('username-changed', newUsername)
                console.log(`[${prevCompositeName}] changed username to '${newUsername}'`)
            }
        }
        else {
            console.warn(`MAJOR: Data for open socket at address ${socketAddress} is missing!`)
        }
    })

    socket.on('disconnect', function () {
        //Abort ongoing handshakes
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

//server.listen(3000)

const addressInfo = server.httpServer.address();

function isAddressInfo(addressInfo: AddressInfo | string | null): addressInfo is AddressInfo {
    return (addressInfo as AddressInfo) != undefined;
}

if (isAddressInfo(addressInfo)) {
    console.log(`Opened server on ${addressInfo.address}, on port ${addressInfo.port}`)
}
else {
    console.log(`Opened server on ${addressInfo}`)
}