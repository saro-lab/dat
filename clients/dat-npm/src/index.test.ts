import {describe, it} from "vitest";

export * from './index.js'

const base62arr = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function randomString(length: number, mold: string): string {
    return [...Array(length)]
        .map(() => mold[Math.floor(Math.random() * mold.length)])
        .join('');
}

export function randomBase62(length: number): string {
    return randomString(length, base62arr);
}

describe('index', () => {
    it('index', () => {
    })
})
