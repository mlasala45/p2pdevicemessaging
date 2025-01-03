export type DeviceIdentifier = {
    address: string,
    username: string
}

/**
 * Functions for defining ArrayDictionaries using DeviceIdentifiers as keys. Pass to ArrayDictionary constructor.
 */
export const KeyFunctions_DeviceIdentifier = {
    keyGetter: (data: { id: DeviceIdentifier }) => data.id,
    keyEquals: (k0: DeviceIdentifier, k1: DeviceIdentifier) => k0.address == k1.address && k0.username == k1.username,
    keyToString: (key: DeviceIdentifier) => `${key.username}@${key.address}`
}

export function toString(value : DeviceIdentifier) {
    if(!value) return Object.prototype.toString.call(value)
    if(value.username) {
        return `${value.username}@${value.address}`
    }
    else
    {
        return `${value.address}`
    }
}

export function parseDeviceIdentifier(str : string) : DeviceIdentifier {
    const [firstVal, secondVal] = str.split('@')
    if(secondVal) {
        return {
            username: firstVal,
            address: secondVal
        }
    }
    else
    {
        return {
            address: firstVal,
            username: ''
        }
    }
}