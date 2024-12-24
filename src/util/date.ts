/**
 * 
 * @returns String in the format HH:MM am/pm.
 */
export function toTimeString(time: Date): string {
    if(!time) return 'ERR'

    let hours = time.getHours();
    let minutes = time.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';

    hours = hours % 12;
    if (hours === 0) {
        hours = 12;
    }

    minutes = minutes < 10 ? 0 + minutes : minutes;

    return `${hours}:${minutes} ${ampm}`;
}