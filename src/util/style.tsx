const BASE_FONT_SIZE = 16;

/**
Converts the input from rem units to px. (1rem = base font size in px)
*/
export const rem = (value: number) => value * BASE_FONT_SIZE;

/**
TODO. Converts the input from em units to px. (1em = local font size in px)
*/
export const em = (value : number) => value * BASE_FONT_SIZE;