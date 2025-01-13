import { DeviceIdentifier } from "./networking/DeviceIdentifier";

export enum Events {
    onSignalSocketStatusChanged,
    onClearChatHistory,
    onSignalServerAddressLoaded,
    onPeerConnectionEstablished
}

export interface EventData_channelId {
    channelId : DeviceIdentifier
}