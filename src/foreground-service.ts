import notifee, { AndroidColor, EventType } from '@notifee/react-native';
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
    notifee.onBackgroundEvent(async ({ type, detail }) => {
        const { notification, pressAction } = detail;
        if (type == EventType.ACTION_PRESS) {
            const pressAction = detail.pressAction!
            if (pressAction.id == 'stop-listening') {
                await stopForegroundService()
            }
        }
    })

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
                                },
                            },
                        })
                    }
                    pushNotificationQueue = pushNotificationQueue.slice(1)
                }
            }, 500)
        });
    });
}

let foregroundServiceStarted = false

export function launchForegroundService() {
    if (!foregroundServiceStarted) launchForegroundServiceAsync()
}

export async function stopForegroundService() {
    notifee.stopForegroundService()
    notifee.cancelNotification('foregroundServiceNotif')
    foregroundServiceStarted = false
}

async function launchForegroundServiceAsync() {
    await notifee.requestPermission()
    const channelId = await getNotifChannelId('foregroundService')

    notifee.displayNotification({
        title: 'Listening for P2P Messages',
        id: 'foregroundServiceNotif',
        android: {
            channelId,
            asForegroundService: true,
            ongoing: true,
            color: AndroidColor.AQUA,
            colorized: true,
            pressAction: {
                id: 'default'
            },
            actions: [{
                title: 'Stop',
                pressAction: {
                    id: 'stop-listening'
                }
            }]
        },
    });
    foregroundServiceStarted = true
}