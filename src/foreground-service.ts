import notifee, { AndroidColor } from '@notifee/react-native';
import { displayNotification, getNotifChannelId } from './util/Notifications';
import { foregroundServiceChannelId } from '..';
import { AppState } from 'react-native';
import { attemptToProcessReceivedMessages } from './networking/ChatNetworking';

interface PushNotificationData { title: string, body: string, notifChannelId: string, icon?: string }
let pushNotificationQueue: PushNotificationData[] = []

/** Enqueues a notification to be dispatched by the Foreground Service. */
export function enqueuePushNotification(data: PushNotificationData) {
    pushNotificationQueue.push(data)
}

export function registerForegroundService() {
    notifee.registerForegroundService((notification) => {
        notifee.requestPermission()
        return new Promise(() => {
            setInterval(async () => {
                //console.log("FG Service running!", new Date(), "pushNotificationQueue.length=", pushNotificationQueue.length)

                attemptToProcessReceivedMessages()
                if (pushNotificationQueue.length > 0) {
                    if (AppState.currentState != "active") { //TODO: Check whether you have that channel open, and send notif if you don't
                        const data = pushNotificationQueue[0]
                        notifee.displayNotification({
                            title: data.title,
                            body: data.body,
                            android: {
                                channelId: foregroundServiceChannelId,
                                smallIcon: data.icon,
                                pressAction: {
                                    id: 'default'
                                }
                            }
                        })
                    }
                    pushNotificationQueue = pushNotificationQueue.slice(1)
                }
            }, 500)

            notifee.onBackgroundEvent(async ({ type, detail }) => {
                const { notification, pressAction } = detail;
            })
        });
    });
}

export async function launchForegroundService() {
    await notifee.requestPermission()
    const channelId = await getNotifChannelId('foregroundService')

    notifee.displayNotification({
        title: 'Open P2P Connections',
        //body: 'This notification will exist for the lifetime of the service runner',
        android: {
            channelId,
            asForegroundService: true,
            color: AndroidColor.OLIVE,
            colorized: true,
        },
    });
}