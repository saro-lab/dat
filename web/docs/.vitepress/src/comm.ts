import {createHighlighter, createJavaScriptRegexEngine} from "shiki";

const UTF8_DECODER = new TextDecoder('utf-8', { fatal: false });
const UTF8_DECODER_FATAL = new TextDecoder('utf-8', { fatal: true });
let highlighterPromise: Promise<any>|null = null;
let highlighter: any = null;


export function getHighlighter(): Promise<any | null> {
    if (highlighter) {
        return Promise.resolve(highlighter);
    }

    if (!highlighterPromise) {
        highlighterPromise = createHighlighter({
            langs: ['yaml', 'bash', 'powershell', 'bat', 'txt', 'toml', 'xml', 'kts'],
            themes: ['github-light', 'github-dark'],
            engine: createJavaScriptRegexEngine()
        } as any)
            .then((resolvedHighlighter) => {
                highlighter = resolvedHighlighter;
                return highlighter;
            })
            .catch((e) => {
                highlighterPromise = null;
                return null;
            });
    }

    return highlighterPromise;
}

export async function doCopyToClipboard(element: EventTarget | null, text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        if (element && element instanceof HTMLElement) {
            element.classList.add('copied');
            setTimeout(() => element.classList.remove('copied'), 1000);
        }
        return true
    } catch (err) {}
    return false;
}

export type ResultBytes = { pass: boolean, data: Uint8Array, odd: boolean };
export type ResultString = { pass: boolean, data: string };

export function fromBase64(b64: string): ResultBytes {
    let rv= { pass: true, data: new Uint8Array(), odd: false } as ResultBytes;
    let nb64 = b64.replace(/\+/g, '-').replace(/\//g, '_');
    if (nb64.indexOf('=') == -1) {
        nb64 = nb64.padEnd(nb64.length + (4 - (nb64.length % 4)) % 4, '=');
    }
    try {
        rv.data = Uint8Array.fromBase64(nb64, {"alphabet": "base64url", "lastChunkHandling": "strict"});
    } catch (e2) {
        rv.pass = false;
        try {
            rv.data = Uint8Array.fromBase64(nb64, {"alphabet": "base64url"});
        } catch (e3) {}
    }
    return rv;
}


export function toUtf8(u8a: Uint8Array): ResultString {
    let rv= { pass: true, data: '' } as ResultString;
    try {
        rv.data = UTF8_DECODER_FATAL.decode(u8a);
    } catch (e2) {
        rv.pass = false;
        try {
            rv.data = UTF8_DECODER.decode(u8a);
        } catch (e3) {}
    }
    return rv;
}

export function fromHex(hex: string): ResultBytes {
    let rv= { pass: true, data: new Uint8Array(), odd: false } as ResultBytes;
    hex = hex.toUpperCase().replace(/[^0-9A-F]+/g, '');
    if (hex.length == 0) {
        return rv;
    }
    if (hex.length % 2 != 0) {
        rv.odd = true;
        hex += '0';
    }
    try {
        rv.data = Uint8Array.fromHex(hex);
    } catch (e2) {
        rv.pass = false;
    }
    return rv;
}

