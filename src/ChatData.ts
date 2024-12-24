import { ToastAndroid } from 'react-native'
import storage from './Storage'

export const allChatChannelsData: Record<string, ChatChannelData> = {}

export interface ChatChannelData {
    timeCreated: Date,
    lastMessageTime: Date,
    lastAccessedTime: Date,
    messages: ChatMessageData[],
    phonyGenerated: boolean,
}

export interface ChatMessageData {
    /**Unique ID needed by FlatList*/
    id: string,
    contentStr: string,
    status: ChatMessageStatus,
    /**Time in milliseconds since epoch */
    timeSent: number
}

export enum ChatMessageStatus {
    ReceivedFromRemoteHost,
    PendingSend,
    Delivered
}

export function loadChannelFromStorage(channelId: string): Promise<void> {
    return new Promise((resolve, error) => {
        storage
            .load({
                key: 'chatChannelsData',
                id: channelId
            }).then((data: ChatChannelData) => {
                console.log(`Success!`)
                allChatChannelsData[channelId] = data
                if (allChatChannelsData[channelId].messages.length == 0) {
                    console.log(`No messages`)
                }
                else {
                    console.log(`Last message: ${allChatChannelsData[channelId].messages[0].contentStr}`);
                }
                resolve();
            }).catch(err => {
                console.log(`Error!`)
                switch (err.name) {
                    case 'NotFoundError':
                        console.log(`Error Not Found. Generating Blank`)
                        const dateNow = new Date(Date.now())
                        const blankData: ChatChannelData = {
                            timeCreated: dateNow,
                            lastMessageTime: dateNow,
                            lastAccessedTime: dateNow,
                            messages: [],
                            phonyGenerated: false
                        }
                        storage.save({
                            key: 'chatChannelsData',
                            id: channelId,
                            data: blankData
                        })
                        allChatChannelsData[channelId] = blankData
                        resolve();
                        break
                    default:
                        console.warn(err.message)
                        ToastAndroid.show(err.toString(), ToastAndroid.LONG)
                        error(err)
                        return;
                }
            })
    })
}

export function deleteChannel(channelId: string) {
    console.log("deleteChannel")
    console.log(channelId)
    delete allChatChannelsData[channelId]
    storage.remove({
        key: 'chatChannelsData',
        id: channelId
    });
}