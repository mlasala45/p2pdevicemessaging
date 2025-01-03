import notifee from '@notifee/react-native';

type ChannelDef = {
    id: string,
    name: string
}
let registeredChannels : ChannelDef[] = []

export function clearRegisteredNotificationChannels() {
    registeredChannels = []
}

export function registerNotificationChannel(channelDef : ChannelDef) {
    registeredChannels.push(channelDef)
}

export function registerNotificationChannels(channelDefs : ChannelDef[]) {
    registeredChannels.push(...channelDefs)
}

/** Returns the id that notifee.displayNotification needs. */
export async function getNotifChannelId(idStr: string) {
    const channelRegIndex = registeredChannels.findIndex(def => def.id == idStr)
    if(channelRegIndex == -1) throw Error(`Failed to find notification channel ${idStr}. Did you forget to register it?`);

    return await notifee.createChannel(registeredChannels[channelRegIndex]);
}

export async function displayNotification(options : { title: string, body: string, notifChannelId: string, icon?: string }) {
    console.log("displayNotification")
    await notifee.requestPermission()
    const channelId = await getNotifChannelId(options.notifChannelId)    
    
    return await notifee.displayNotification({
        title: options.title,
        body: options.body,
        android: {
            channelId,
            smallIcon: options.icon,
            pressAction: {
                id: 'default'
            }
        }
    })
}