const CODE_LEXICON_SIZE = 36;

function getCharForDigitVal(digitVal: number): string {
    if (digitVal >= 0 && digitVal <= 25) {
        return String.fromCharCode(digitVal + 65); // A-Z
    } else if (digitVal >= 26 && digitVal <= 35) {
        return String.fromCharCode(digitVal - 26 + 48); // 0-9
    } else {
        throw new Error(`digitVal must be between 0 and ${CODE_LEXICON_SIZE - 1}, inclusive. (Received ${digitVal})`);
    }
}

function getDigitValForChar(char: string): number {
    const charCode = char.charCodeAt(0);

    if (charCode >= 65 && charCode <= 90) { // A-Z
        return charCode - 65;
    } else if (charCode >= 48 && charCode <= 57) { // 0-9
        return charCode - 48 + 26;
    } else {
        throw new Error(`Invalid character: ${char}`);
    }
}

function encodeNumber(num: number): string {
    if (num === 0) return getCharForDigitVal(0);

    const base = CODE_LEXICON_SIZE;
    let result = '';
    while (num > 0) {
        const remainder = num % base;
        result = getCharForDigitVal(remainder) + result;
        num = Math.floor(num / base);
    }

    return result;
}

function decodeStringToNumber(encodedStr: string): number {
    let result = 0;
    let base = CODE_LEXICON_SIZE;

    for (let i = 0; i < encodedStr.length; i++) {
        const digitVal = getDigitValForChar(encodedStr[i]);
        result = result * base + digitVal;
    }

    return result;
}

function ipv4To32BitNumber(ipv4: string): number {
    const octets = ipv4.split('.').map(Number);
    if (octets.length !== 4 || octets.some(octet => octet < 0 || octet > 255)) {
        throw new Error(`Invalid IPv4 address: ${ipv4}`);
    }

    return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

export function encodeIpv4(ipv4: string): string {
    const num = ipv4To32BitNumber(ipv4);
    let encoded = encodeNumber(num)
    while (encoded.length < 7) {
        encoded = '0' + encoded;
    }
    encoded = encoded.slice(0, 3) + '-' + encoded.slice(3);
    return encoded;
}

export function decodeToIpv4(codeStr: string): string {
    try {
        const cleanStr = codeStr.replace('-', '');
        const num = decodeStringToNumber(cleanStr);

        const octet1 = (num >>> 24) & 0xFF;
        const octet2 = (num >>> 16) & 0xFF;
        const octet3 = (num >>> 8) & 0xFF;
        const octet4 = num & 0xFF;

        return `${octet1}.${octet2}.${octet3}.${octet4}`;
    }
    catch (e) {
        return "ERR"
    }
}

export function isCodeValid(code: string) {
    const regex = /^[A-Za-z0-9]{3}-[A-Za-z0-9]{4}$/;
    return regex.test(code);
}