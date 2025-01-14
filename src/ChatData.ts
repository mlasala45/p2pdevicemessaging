import Toast from 'react-native-toast-message'
import storage from './Storage'
import ArrayDictionary from './util/ArrayDictionary'

import { DeviceIdentifier, KeyFunctions_DeviceIdentifier, parseDeviceIdentifier, toString } from './networking/DeviceIdentifier';
import { forceRerenderApp } from './App';

export const allChatChannelsDetailsData = new ArrayDictionary<DeviceIdentifier, ChatChannelDetailsData>(KeyFunctions_DeviceIdentifier)
export const allChatChannelsContentData = new ArrayDictionary<DeviceIdentifier, ChatChannelContentData>(KeyFunctions_DeviceIdentifier)

/** Information that is loaded for all channels on launch. */
export type ChatChannelDetailsData = {
    id: DeviceIdentifier,
    name: string
    timeCreated: Date,
    lastMessageTime: Date,
    lastAccessedTime: Date,
}

/** Information that is only loaded once the channel is accessed. */
export type ChatChannelContentData = {
    id: DeviceIdentifier,
    messages: ChatMessageData[],
    phonyGenerated: boolean,
}

interface Annotations {
    isFirstFromThisUserInBlock: boolean,
}

export interface ChatMessageData {
    /**Unique ID needed by FlatList*/
    id: string,
    contentStr: string,
    status: ChatMessageStatus,
    /**Time in milliseconds since epoch */
    timeSent: number
    user: string
    annotations?: Annotations
}

export enum ChatMessageStatus {
    ReceivedFromRemoteHost,
    PendingSend,
    Delivered,
    NotSent //Happens if the message was removed from the pending queue without ever being sent
}

function BlankChannelData(channelId: DeviceIdentifier) {
    return {
        id: channelId,
        name: toString(channelId),
        timeCreated: new Date(Date.now()),
        lastMessageTime: new Date(0),
        lastAccessedTime: new Date(0)
    }
}

export function createNewChannel(channelId: DeviceIdentifier) {
    allChatChannelsDetailsData.add(BlankChannelData(channelId))
    onChannelDetailsModified(channelId)
}

export function onChannelDetailsModified(channelId: DeviceIdentifier) {
    new Promise(() => {
        storage.save({
            key: 'chatChannelsData_details',
            id: toString(channelId),
            data: allChatChannelsDetailsData.get(channelId)
        })
    })
}

/**Saves the changes to persistent storage. */
export function onChannelContentModified(channelId: DeviceIdentifier) {
    return new Promise(() => {
        storage.save({
            key: 'chatChannelsData_content',
            id: toString(channelId),
            data: allChatChannelsContentData.get(channelId)
        })
    })
}

export function loadAllChannelDetailsFromStorage(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        storage.getAllDataForKey('chatChannelsData_details').then((channelDetails: ChatChannelDetailsData[]) => {
            storage.getIdsForKey('chatChannelsData_details').then(ids => {
                channelDetails = channelDetails.filter(item => item != null)
                ids.forEach(idStr => {
                    console.log("idStr", idStr)
                    if (channelDetails.findIndex(item => toString(item.id) == idStr) == -1) {
                        console.log("missing")
                        //Channel data was null, create a blank channel for it
                        channelDetails.push(BlankChannelData(parseDeviceIdentifier(idStr)))
                    }
                })
                allChatChannelsDetailsData.loadFromArray(channelDetails)
                resolve()
            })
        }).catch((err: Error) => {
            switch (err.name) {
                case 'NotFoundError':
                    allChatChannelsDetailsData.clear()
                    resolve()
                    break
                default:
                    Toast.show({
                        type: 'error',
                        text1: `Error loading storage/chatChannelsData_details: ${err.message}`,
                        visibilityTime: 3000
                    })
                    reject()
            }
        })
    })
}

export function loadChannelContentFromStorage(channelId: DeviceIdentifier): Promise<void> {
    return new Promise((resolve, error) => {
        storage
            .load({
                key: 'chatChannelsData_content',
                id: toString(channelId)
            }).then((data: ChatChannelContentData) => {
                console.log(`Success!`)
                allChatChannelsContentData.set(data)
                if (allChatChannelsContentData.get(channelId)!.messages.length == 0) {
                    console.log(`No messages`)
                }
                else {
                    console.log(`Last message: ${allChatChannelsContentData.get(channelId)!.messages[0].contentStr}`);
                }
                resolve();
            }).catch(err => {
                console.log(`Error!`)
                switch (err.name) {
                    case 'NotFoundError':
                        console.log(`Error: Not Found. Generating Blank`)
                        const dateNow = new Date(Date.now())
                        const blankData: ChatChannelContentData = {
                            id: channelId,
                            messages: [],
                            phonyGenerated: false
                        }
                        storage.save({
                            key: 'chatChannelsData',
                            id: toString(channelId),
                            data: blankData
                        })
                        allChatChannelsContentData.set(blankData)
                        resolve();
                        break
                    default:
                        console.warn(err.message)
                        Toast.show({
                            type: 'error',
                            text1: err.message,
                            visibilityTime: 3000
                        })
                        error(err)
                        return;
                }
            })
    })
}

export function deleteChatChannel(channelId: DeviceIdentifier) {
    console.log("deleteChannel")
    console.log(channelId)

    allChatChannelsDetailsData.remove(channelId)
    storage.remove({
        key: 'chatChannelsData_details',
        id: toString(channelId)
    });

    allChatChannelsContentData.remove(channelId)
    storage.remove({
        key: 'chatChannelsData_content',
        id: toString(channelId)
    });

    forceRerenderApp()
}

//TODO: All removal functions should technically wait for the removal promise to return
export function deleteAllChannels(): Promise<void> {
    return new Promise((resolve) => {
        allChatChannelsDetailsData.clear()
        storage.clearMapForKey('chatChannelsData_details');

        allChatChannelsContentData.clear()
        storage.clearMapForKey('chatChannelsData_content');

        forceRerenderApp()
        resolve()
    })
}

//TODO: Redesign for scale. We can't go over ridiculously long chat histories with this approach.
/**Does not call onChannelContentModified.*/
export function recalculateChannelAnnotations(channelId: DeviceIdentifier) {
    const contentData = allChatChannelsContentData.get(channelId)
    if (!contentData) return

    //Messages are stored LIFO
    let prevUser = ''
    for (let i = contentData.messages.length; i >= 0; i--) {
        const msgData = contentData.messages[i]
        if(!msgData) {
            console.warn(`Message data is null at [${toString(channelId)}].messages[${i}]`)
            continue
        }
        // @ts-ignore
        if (!msgData.annotations) msgData.annotations = {}
        msgData.annotations!.isFirstFromThisUserInBlock = prevUser != msgData.user
        prevUser = msgData.user
    }
}