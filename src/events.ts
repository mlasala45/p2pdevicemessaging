import { DeviceIdentifier } from "./networking/DeviceIdentifier";

export enum Events {
    onSignalSocketStatusChanged,
    onChatHistoryCleared,
    onChatHistoryModified,
    onSignalServerAddressLoaded,
    onPeerConnectionEstablished,
    openDialog_deleteSelectedMessages
}

export interface EventData_channelId {
    channelId : DeviceIdentifier
}