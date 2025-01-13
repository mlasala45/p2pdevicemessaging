import { DeviceIdentifier } from "./networking/DeviceIdentifier";

export enum Events {
    onSignalSocketStatusChanged,
    onClearChatHistory
}

export interface EventData_onClearChatHistory {
    channelId : DeviceIdentifier
}