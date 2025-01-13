import { DeviceIdentifier } from "./networking/DeviceIdentifier";

export enum Events {
    onSignalSocketStatusChanged,
    onClearChatHistory,
    onSignalServerAddressLoaded
}

export interface EventData_onClearChatHistory {
    channelId : DeviceIdentifier
}