"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var socket_io_1 = require("socket.io");
var http = require('http');
var httpServer = http.createServer();
httpServer.listen(3000, '0.0.0.0');
var server = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins (you can also specify specific origins, e.g., "http://example.com")
        methods: ["GET", "POST"], // Allow GET and POST methods
        credentials: true, // Enable credentials (cookies, authorization headers, etc.)
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
    ConnectedHostData.prototype.getIdentifier = function () {
        return { address: this.socket.handshake.address, username: this.username };
    };
    ConnectedHostData.prototype.matchesIdentifier = function (value) {
        if (this.socket.handshake.address != value.address)
            return false;
        if (value.username == '' || value.username == '*')
            return true;
        return this.username == value.username;
    };
    ConnectedHostData.prototype.isPeerBlacklisted = function (peerId) {
        console.log("[".concat(this.compositeName, "]: Is host ").concat(peerId.username, "@").concat(peerId.address, " blacklisted?"));
        if (!this.rejectedConnectionRequests)
            this.rejectedConnectionRequests = [];
        console.log("Blacklist: (N=".concat(this.rejectedConnectionRequests.length, ")"));
        this.rejectedConnectionRequests.forEach(function (samplePeerId) { return console.log("".concat(samplePeerId.username, "@").concat(samplePeerId.address)); });
        var matchIndex = this.rejectedConnectionRequests.findIndex(function (samplePeerId) { return deviceIdsMatch(peerId, samplePeerId); });
        console.log("matchIndex=".concat(matchIndex));
        if (matchIndex >= 0)
            return true;
        return false;
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
        var hostsByUser = allConnectedHosts[id.address];
        if (id.username == '*' || id.username == '') {
            var values = Object.values(hostsByUser);
            if (values.length > 0) {
                return values[0];
            }
            else {
                return undefined;
            }
        }
        return allConnectedHosts[id.address][id.username];
    }
    return null;
}
function relayAllConnectionRequestsFromHost(hostData) {
    var _a;
    (_a = hostData.pendingConnectionRequests) === null || _a === void 0 ? void 0 : _a.forEach(function (requestedPeer) {
        var match = getHost(requestedPeer);
        if (match) {
            tryReportRequestedConnection(match, hostData);
        }
    });
}
function retractAllConnectionRequestsFromHost(hostData) {
    var _a;
    (_a = hostData.pendingConnectionRequests) === null || _a === void 0 ? void 0 : _a.forEach(function (requestedPeer) {
        var match = getHost(requestedPeer);
        if (match) {
            if (!hostData.rejectedConnectionRequests)
                hostData.rejectedConnectionRequests = [];
            var matchIndex = hostData.rejectedConnectionRequests.findIndex(function (samplePeerId) { return deviceIdsMatch(requestedPeer, samplePeerId); });
            if (matchIndex < 0) {
                console.log("To [".concat(match.compositeName, "]: [").concat(hostData.compositeName, "] withdrew its connection request."));
                match.socket.emit('cancel-connection-request', {
                    sender: hostData.getIdentifier()
                });
            }
        }
    });
}
function tryReportRequestedConnection(recipientHostData, requesterHostData) {
    console.log(tryReportRequestedConnection, recipientHostData.compositeName, requesterHostData.compositeName);
    var requesterId = requesterHostData.getIdentifier();
    //Check whether the peer has previously rejected the requester
    if (!recipientHostData.rejectedConnectionRequests)
        recipientHostData.rejectedConnectionRequests = [];
    var matchIndex = recipientHostData.rejectedConnectionRequests.findIndex(function (samplePeerId) { return deviceIdsMatch(requesterId, samplePeerId); });
    console.log("matchIndex", matchIndex);
    if (matchIndex < 0) {
        console.log("To [".concat(recipientHostData.compositeName, "]: [").concat(requesterHostData.compositeName, "] wants to connect to you."));
        recipientHostData.socket.emit('request-connection', {
            sender: requesterId
        });
    }
}
function checkAllConnectedHostsForRequestsToCertainHost(hostData) {
    console.log("[".concat(hostData.compositeName, "] check-for-existing-requests"));
    Object.values(allConnectedHosts).forEach(function (hostsByUser) {
        Object.values(hostsByUser).forEach(function (otherHostData) {
            var _a;
            if (otherHostData == hostData)
                return;
            console.log("-> ".concat(otherHostData.compositeName, "; Num saved requests: ").concat(otherHostData.pendingConnectionRequests ? otherHostData.pendingConnectionRequests.length : 0));
            (_a = otherHostData.pendingConnectionRequests) === null || _a === void 0 ? void 0 : _a.forEach(function (requestedPeer) {
                console.log("-> -> ".concat(requestedPeer.username, "@").concat(requestedPeer.address, "; match=").concat(hostData.matchesIdentifier(requestedPeer)));
                if (hostData.matchesIdentifier(requestedPeer)) {
                    tryReportRequestedConnection(hostData, otherHostData);
                }
            });
        });
    });
}
function deviceIdsMatch(a, b) {
    if (a.address != b.address)
        return false;
    if (a.username == '*' || a.username == '' || b.username == '*' || b.username == '')
        return true;
    return a.username == b.username;
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
    checkAllConnectedHostsForRequestsToCertainHost(hostData);
    socket.on('sync-connection-requests', function (requests) {
        console.log("[".concat(hostData.compositeName, "] sync-connection-requests: N=").concat(requests.length, "}"));
        hostData.pendingConnectionRequests = requests;
        //Remove any blacklist entries from peers being requested
        if (hostData.rejectedConnectionRequests) {
            requests.forEach(function (requestedPeerId) {
                hostData.rejectedConnectionRequests = hostData.rejectedConnectionRequests.filter(function (peerId) { return !deviceIdsMatch(peerId, requestedPeerId); });
            });
        }
        relayAllConnectionRequestsFromHost(hostData);
    });
    socket.on('cancel-connection-request', function (_a) {
        var _b;
        var peerId = _a.peerId;
        if (!peerId)
            return;
        console.log("[".concat(hostData.compositeName, "] cancel-connection-request: peerId=").concat(peerId.username, "@").concat(peerId.address));
        var match = getHost(peerId);
        if (match) {
            console.log("To [".concat(match.compositeName, "]: [").concat(hostData.compositeName, "] withdrew its connection request."));
            match.socket.emit('cancel-connection-request', {
                sender: hostData.getIdentifier()
            });
            hostData.pendingConnectionRequests = (_b = hostData.pendingConnectionRequests) === null || _b === void 0 ? void 0 : _b.filter(function (requestedPeer) { return !deviceIdsMatch(requestedPeer, peerId); });
        }
    });
    socket.on('accept-connection-request', function (_a) {
        var peerId = _a.peerId;
        if (!peerId)
            return;
        console.log("[".concat(hostData.compositeName, "] accept-connection-request: peerId=").concat(peerId.username, "@").concat(peerId.address));
        var match = getHost(peerId);
        if (match) {
            var acceptingPeer_1 = hostData.getIdentifier();
            var matchIndex = match.pendingConnectionRequests ? match.pendingConnectionRequests.findIndex(function (requestedPeer) { return deviceIdsMatch(requestedPeer, acceptingPeer_1); }) : -1;
            if (matchIndex < 0) {
                //Connection was not requested
                socket.emit('cancel-connection-request', { peerId: peerId });
            }
            else {
                socket.emit('start-ice-handshake', {
                    peerAddress: peerId.address,
                    peerUsername: peerId.username,
                    shouldSendOffer: true
                });
                match.socket.emit('start-ice-handshake', {
                    peerAddress: acceptingPeer_1.address,
                    peerUsername: acceptingPeer_1.username,
                    shouldSendOffer: false
                });
                hostData.onPairingStarted({
                    address: peerId.address,
                    username: peerId.username
                });
                match.onPairingStarted({
                    address: acceptingPeer_1.address,
                    username: acceptingPeer_1.username
                });
                console.log("--> Starting Handshake");
            }
        }
    });
    socket.on('reject-connection-request', function (_a) {
        var peerId = _a.peerId;
        if (!peerId)
            return;
        console.log("[".concat(hostData.compositeName, "] reject-connection-request: peerId=").concat(peerId.username, "@").concat(peerId.address));
        if (!hostData.rejectedConnectionRequests)
            hostData.rejectedConnectionRequests = [];
        var matchIndex = hostData.rejectedConnectionRequests.findIndex(function (samplePeerId) { return deviceIdsMatch(peerId, samplePeerId); });
        if (matchIndex < 0) {
            console.log('Adding blacklist record');
            hostData.rejectedConnectionRequests.push(peerId);
        }
    });
    socket.on('reconnect-existing-connection', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var hostId, peerHostData, response;
        var _c;
        var peerId = _b.peerId;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!peerId)
                        return [2 /*return*/];
                    console.log("[".concat(hostData.compositeName, "] wants to reconnect to ").concat(peerId.username, "@").concat(peerId.address));
                    hostId = hostData.getIdentifier();
                    peerHostData = getHost(peerId);
                    if (!peerHostData) return [3 /*break*/, 2];
                    if (!!peerHostData.isPeerBlacklisted(hostId)) return [3 /*break*/, 2];
                    return [4 /*yield*/, peerHostData.socket.emitWithAck('reconnect-existing-connection', { sender: hostId })];
                case 1:
                    response = _d.sent();
                    if (response == 'approve') {
                        socket.emit('start-ice-handshake', {
                            peerAddress: peerId.address,
                            peerUsername: peerId.username,
                            shouldSendOffer: false
                        });
                        hostData.onPairingStarted(peerId);
                        peerHostData.onPairingStarted(hostId);
                    }
                    else {
                        //The receiving peer is treating it as a new connection request that needs approval
                        (_c = hostData.pendingConnectionRequests) === null || _c === void 0 ? void 0 : _c.push(peerId);
                    }
                    _d.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    }); });
    //Received by remote peer when a connection request is first issued.
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
                retractAllConnectionRequestsFromHost(hostData);
                delete allConnectedHosts[socketAddress][hostData.username];
                hostData.username = newUsername;
                hostData.compositeName = newCompositeName;
                allConnectedHosts[socketAddress][newUsername] = hostData;
                //Reissue connection requests under new username
                relayAllConnectionRequestsFromHost(hostData);
                socket.emit('username-changed', newUsername);
                console.log("[".concat(prevCompositeName, "] changed username to '").concat(newUsername, "'"));
            }
        }
        else {
            console.warn("MAJOR: Data for open socket at address ".concat(socketAddress, " is missing!"));
        }
    });
    socket.on('disconnect', function () {
        //TODO: Abort ongoing handshakes
        retractAllConnectionRequestsFromHost(hostData);
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
