import {
    connectToRemoteHost,
    disconnectFromHost as networkAction_disconnectFromHost,
    ConnectToRemoteHostCallbacks
} from './Networking';

export function connectToHost(address: string, callbacks : ConnectToRemoteHostCallbacks) {
    connectToRemoteHost(address, callbacks)
}

export function disconnectFromHost(address: string) : boolean {
    return networkAction_disconnectFromHost(address)
}