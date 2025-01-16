export type DeviceIdentifier = {
    address: string,
    username: string
}

export function toString(value?: DeviceIdentifier) {
    if (!value) return Object.prototype.toString.call(value)
    if (value.username) {
        return `${value.username}@${value.address}`
    }
    else {
        return `${value.address}`
    }
}

export const DeviceIdentifierUtils = {
    /**Checks for member-wise equality between two DeviceIdentifiers.*/
    equals(k0: DeviceIdentifier, k1: DeviceIdentifier): boolean {
        if(!k0) return !k1;
        if(!k1) return !k0;
        return k0.address === k1.address && k0.username === k1.username;
    },

    /**Checks to see if the device identifiers could match. Supports wildcard/omitted usernames.*/
    matches(k0: DeviceIdentifier, k1: DeviceIdentifier) {
        if(!k0) return !k1;
        if(!k1) return !k0;
        if(k0.address != k1.address) return false;
        if(k0.username == '' || k0.username == '*' || k1.username == '' || k1.username == '*') return true;
        return k0.username == k1.username;
    },

    parseDeviceIdentifier(str: string): DeviceIdentifier {
        const [firstVal, secondVal] = str.split('@')
        if (secondVal) {
            return {
                username: firstVal,
                address: secondVal
            }
        }
        else {
            return {
                address: firstVal,
                username: ''
            }
        }
    }
}

/**
 * Functions for defining ArrayDictionaries using DeviceIdentifiers as keys. Pass to ArrayDictionary constructor.
 */
export const KeyFunctions_DeviceIdentifier = {
    keyGetter: (data: { id: DeviceIdentifier }) => data.id,
    keyEquals: DeviceIdentifierUtils.equals,
    keyToString: (key: DeviceIdentifier) => `${key.username}@${key.address}`
}