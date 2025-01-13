"use strict";
exports.__esModule = true;
var socket_io_1 = require("socket.io");
var http = require('http');
var httpServer = http.createServer();
httpServer.listen(3000, '0.0.0.0');
var server = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});
var HANDSHAKE_TIMEOUT = 10 * 1000;
var ConnectedHostData = /** @class */ (function () {
    function ConnectedHostData() {
    }
    ConnectedHostData.prototype.onPairingStarted = function (peerId) {
        this.pairingState = {
            otherPeer: peerId,
            pairingStartedTime: new Date()
        };
    };
    ConnectedHostData.prototype.onPairingFinished = function () {
        this.pairingState = null;
    };
    ConnectedHostData.prototype.isBusyPairing = function () {
        if (!this.pairingState)
            return false;
        var timeElapsed = Date.now() - this.pairingState.pairingStartedTime.getTime();
        if (timeElapsed > HANDSHAKE_TIMEOUT) {
            this.pairingState = null;
            return false;
        }
        return true;
    };
    return ConnectedHostData;
}());
var allConnectedHosts = {};
function terminateHandshake(a, b) {
    try {
        var hostData_a = allConnectedHosts[a.address][a.username];
        var hostData_b = allConnectedHosts[b.address][b.username];
        hostData_a.onPairingFinished();
        hostData_b.onPairingFinished();
    }
    catch (error) {
        console.warn("Error terminating handshake.");
        console.warn(error.message);
    }
}
function getHost(id) {
    if (id && allConnectedHosts[id.address]) {
        return allConnectedHosts[id.address][id.username];
    }
    return null;
}
server.on("connection", function (socket) {
    var socketAddress = socket.handshake.address;
    var username = socket.handshake.query.username;
    var compositeName = "".concat(username, "@").concat(socketAddress);
    var hostData = new ConnectedHostData();
    hostData.socket = socket;
    hostData.username = username;
    hostData.compositeName = compositeName;
    hostData.pairingState = null;
    console.log("[".concat(hostData.compositeName, "] connected"));
    if (!allConnectedHosts[socketAddress])
        allConnectedHosts[socketAddress] = {};
    allConnectedHosts[socketAddress][username] = hostData;
    socket.on('request-connection', function (peerAddress, peerUsername) {
        var peerCompositeName = "".concat(peerUsername || '*', "@").concat(peerAddress);
        console.log("[".concat(hostData.compositeName, "] requested connection to ").concat(peerCompositeName));
        var matchingRecord;
        if (allConnectedHosts[peerAddress]) {
            if (peerUsername) {
                matchingRecord = allConnectedHosts[peerAddress][peerUsername];
            }
            else {
                matchingRecord = Object.values(allConnectedHosts[peerAddress])[0];
            }
        }
        if (matchingRecord) {
            if (matchingRecord.currentlyPairingWith) {
                console.log("--> Peer busy");
                socket.emit('peer-busy', peerAddress, peerUsername);
            }
            else {
                hostData.onPairingStarted({
                    address: peerAddress,
                    username: matchingRecord.username
                });
                matchingRecord.onPairingStarted({
                    address: socketAddress,
                    username: hostData.username
                });
                console.log("--> Starting Handshake");
                socket.emit('start-ice-handshake', peerAddress, matchingRecord.username, true); //Original requester an 'offer' and waits for an 'answer' and candidates
                matchingRecord.socket.emit('start-ice-handshake', socketAddress, hostData.username, false); //Peer starts listening for offer and candidates
            }
        }
        else {
            console.log("--> Unknown Peer");
            socket.emit('unknown-peer', peerAddress, peerUsername);
        }
    });
    socket.on('ice-success', function () {
        if (hostData.pairingState) {
            var otherPeerId = hostData.pairingState.otherPeer;
            console.log("Pairing succeeded between", hostData.compositeName, "and", "".concat(otherPeerId.username || '', "@").concat(otherPeerId.address));
            terminateHandshake({
                address: socketAddress,
                username: hostData.username
            }, otherPeerId);
        }
    });
    socket.on('change-username', function (newUsername) {
        var prevCompositeName = hostData.compositeName;
        var newCompositeName = "".concat(newUsername, "@").concat(socketAddress);
        if (allConnectedHosts[socketAddress]) {
            if (allConnectedHosts[socketAddress][newUsername]) {
                //Name is already taken
                socket.emit('err-username-reserved', newUsername);
                console.log("[".concat(prevCompositeName, "] failed to change username to reserved: '").concat(newUsername, "'"));
            }
            else {
                delete allConnectedHosts[socketAddress][hostData.username];
                hostData.username = newUsername;
                hostData.compositeName = newCompositeName;
                allConnectedHosts[socketAddress][newUsername] = hostData;
                socket.emit('username-changed', newUsername);
                console.log("[".concat(prevCompositeName, "] changed username to '").concat(newUsername, "'"));
            }
        }
        else {
            console.warn("MAJOR: Data for open socket at address ".concat(socketAddress, " is missing!"));
        }
    });
    socket.on('disconnect', function () {
        //Abort ongoing handshakes
        console.log("[".concat(hostData.compositeName, "] disconnected"));
        delete allConnectedHosts[socketAddress][hostData.username];
    });
    socket.on('ice-candidate', function (candidateData) {
        var _a, _b;
        console.log("[".concat(hostData.compositeName, "] <ice-candidate> : ").concat(Object.keys(candidateData)));
        (_b = getHost((_a = hostData.pairingState) === null || _a === void 0 ? void 0 : _a.otherPeer)) === null || _b === void 0 ? void 0 : _b.socket.emit('ice-candidate', candidateData);
    });
    socket.on('ice-offer', function (offerData) {
        var _a, _b;
        console.log("[".concat(hostData.compositeName, "] <ice-offer> : ").concat(Object.keys(offerData)));
        (_b = getHost((_a = hostData.pairingState) === null || _a === void 0 ? void 0 : _a.otherPeer)) === null || _b === void 0 ? void 0 : _b.socket.emit('ice-offer', offerData);
    });
    socket.on('ice-answer', function (answerData) {
        var _a, _b;
        console.log("[".concat(hostData.compositeName, "] <ice-answer> : ").concat(Object.keys(answerData)));
        (_b = getHost((_a = hostData.pairingState) === null || _a === void 0 ? void 0 : _a.otherPeer)) === null || _b === void 0 ? void 0 : _b.socket.emit('ice-answer', answerData);
    });
});
//server.listen(3000)
var addressInfo = server.httpServer.address();
function isAddressInfo(addressInfo) {
    return addressInfo != undefined;
}
if (isAddressInfo(addressInfo)) {
    console.log("Opened server on ".concat(addressInfo.address, ", on port ").concat(addressInfo.port));
}
else {
    console.log("Opened server on ".concat(addressInfo));
}
