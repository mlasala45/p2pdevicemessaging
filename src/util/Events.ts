type EventHandler = (e: any) => void

const allEventHandlers: Record<string, EventHandlersByKeyRecord> = {}

type EventHandlersByKeyRecord = Record<string, EventHandler>

/**
 * 
 * @param eventKey The key that will be used to raise the event.
 * @param handlerKey A unique key for this handler. Registering the same key again will overwrite the old handler.
 * @param handler The handler that will be executed when the event is raised.
 * @returns The same handler that was passed in.
 */
export function registerEventHandler(eventKey: string | number, handlerKey: string, handler: EventHandler): EventHandler {
    eventKey = String(eventKey)
    if (!allEventHandlers[eventKey]) allEventHandlers[eventKey] = {}
    const thisEventAllHandlers = allEventHandlers[eventKey]
    thisEventAllHandlers[handlerKey] = handler
    return handler
}

export function deregisterEventHandler(eventKey: string | number, handlerKey: string) {
    eventKey = String(eventKey)
    const thisEventAllHandlers = allEventHandlers[eventKey]
    if (thisEventAllHandlers) {
        delete thisEventAllHandlers[handlerKey]
    }
}

/**Calls each handler registered to this event key. The data parameter will be passed to the event handler. */
export function raiseEvent(eventKey: string | number, data: any) {
    eventKey = String(eventKey)
    if (allEventHandlers[eventKey]) {
        Object.values(allEventHandlers[eventKey]).forEach(handler => {
            try {
                handler(data)
            } catch (e) {
                console.warn(`Error handling event '${eventKey}'`)
                console.error(e)
            }
        })
    }
}