import {BlockCipher} from "../lib/block-cipher.class.js";
import {WordArray} from "../lib/word-array.class.js";
import {BufferedBlockAlgorithmConfig} from "../lib/buffered-block-algorithm-config.interface.js";

/* eslint-disable @typescript-eslint/naming-convention */
// Define lookup tables
const SBOX: number[] = [];
const INV_SBOX: number[] = [];
const SUB_MIX_0: number[] = [];
const SUB_MIX_1: number[] = [];
const SUB_MIX_2: number[] = [];
const SUB_MIX_3: number[] = [];
const INV_SUB_MIX_0: number[] = [];
const INV_SUB_MIX_1: number[] = [];
const INV_SUB_MIX_2: number[] = [];
const INV_SUB_MIX_3: number[] = [];

// Compute lookup tables
(function () {
    // Compute double table
    const d = [];
    for (let i = 0; i < 256; i++) {
        if (i < 128) {
            d[i] = i << 1;
        }
        else {
            d[i] = (i << 1) ^ 0x11b;
        }
    }

    // Walk GF(2^8)
    let x = 0;
    let xi = 0;
    for (let i = 0; i < 256; i++) {
        // Compute sbox
        let sx = xi ^ (xi << 1) ^ (xi << 2) ^ (xi << 3) ^ (xi << 4);
        sx = (sx >>> 8) ^ (sx & 0xff) ^ 0x63;
        SBOX[x] = sx;
        INV_SBOX[sx] = x;

        // Compute multiplication
        const x2 = d[x];
        const x4 = d[x2];
        const x8 = d[x4];

        // Compute sub bytes, mix columns tables
        let t = (d[sx] * 0x101) ^ (sx * 0x1010100);
        SUB_MIX_0[x] = (t << 24) | (t >>> 8);
        SUB_MIX_1[x] = (t << 16) | (t >>> 16);
        SUB_MIX_2[x] = (t << 8) | (t >>> 24);
        SUB_MIX_3[x] = t;

        // Compute inv sub bytes, inv mix columns tables
        t = (x8 * 0x1010101) ^ (x4 * 0x10001) ^ (x2 * 0x101) ^ (x * 0x1010100);
        INV_SUB_MIX_0[sx] = (t << 24) | (t >>> 8);
        INV_SUB_MIX_1[sx] = (t << 16) | (t >>> 16);
        INV_SUB_MIX_2[sx] = (t << 8) | (t >>> 24);
        INV_SUB_MIX_3[sx] = t;

        // Compute next counter
        if (!x) {
            x = xi = 1;
        }
        else {
            x = x2 ^ d[d[d[x8 ^ x2]]];
            xi ^= d[d[xi]];
        }
    }
}());

// Precomputed Rcon lookup
const RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];
/* eslint-enable @typescript-eslint/naming-convention */

export class AES extends BlockCipher {

    static keySize = 256 / 32;

    protected _invKeySchedule!: number[];
    protected _key: WordArray;
    protected _keyPriorReset!: WordArray;
    protected _keySchedule!: number[];
    protected _nRounds!: number;

    constructor(xformMode: number, key: WordArray, cfg?: BufferedBlockAlgorithmConfig) {
        super(xformMode, key, cfg);
        super.reset();
    }

    decryptBlock(m: number[], offset: number) {
        // Swap 2nd and 4th rows
        let t = m[offset + 1];
        m[offset + 1] = m[offset + 3];
        m[offset + 3] = t;

        this._doCryptBlock(m, offset, this._invKeySchedule, INV_SUB_MIX_0, INV_SUB_MIX_1, INV_SUB_MIX_2, INV_SUB_MIX_3, INV_SBOX);

        // Inv swap 2nd and 4th rows
        t = m[offset + 1];
        m[offset + 1] = m[offset + 3];
        m[offset + 3] = t;
    }

    encryptBlock(m: number[], offset: number) {
        this._doCryptBlock(m, offset, this._keySchedule, SUB_MIX_0, SUB_MIX_1, SUB_MIX_2, SUB_MIX_3, SBOX);
    }

    reset() {
        // reset core values
        super.reset();

        // Skip reset of nRounds has been set before and key did not change
        if (this._nRounds && this._keyPriorReset === this._key) {
            return;
        }

        // Shortcuts
        const key = this._keyPriorReset = this._key;
        const keyWords = key.words;
        const keySize = key.sigBytes / 4;

        // Compute number of rounds
        const nRounds = this._nRounds = keySize + 6;

        // Compute number of key schedule rows
        const ksRows = (nRounds + 1) * 4;

        // Compute key schedule
        const keySchedule: number[] = this._keySchedule = [];
        for (let ksRow = 0; ksRow < ksRows; ksRow++) {
            if (ksRow < keySize) {
                keySchedule[ksRow] = keyWords[ksRow];
            }
            else {
                let t = keySchedule[ksRow - 1];

                if (!(ksRow % keySize)) {
                    // Rot word
                    t = (t << 8) | (t >>> 24);

                    // Sub word
                    t = (SBOX[t >>> 24] << 24) | (SBOX[(t >>> 16) & 0xff] << 16) | (SBOX[(t >>> 8) & 0xff] << 8) | SBOX[t & 0xff];

                    // Mix Rcon
                    t ^= RCON[(ksRow / keySize) | 0] << 24;
                }
                else if (keySize > 6 && ksRow % keySize === 4) {
                    // Sub word
                    t = (SBOX[t >>> 24] << 24) | (SBOX[(t >>> 16) & 0xff] << 16) | (SBOX[(t >>> 8) & 0xff] << 8) | SBOX[t & 0xff];
                }

                keySchedule[ksRow] = keySchedule[ksRow - keySize] ^ t;
            }
        }

        // Compute inv key schedule
        this._invKeySchedule = [];
        for (let invKsRow = 0; invKsRow < ksRows; invKsRow++) {
            const ksRow = ksRows - invKsRow;

            let t;
            if (invKsRow % 4) {
                t = keySchedule[ksRow];
            }
            else {
                t = keySchedule[ksRow - 4];
            }

            if (invKsRow < 4 || ksRow <= 4) {
                this._invKeySchedule[invKsRow] = t;
            }
            else {
                this._invKeySchedule[invKsRow] = INV_SUB_MIX_0[SBOX[t >>> 24]] ^ INV_SUB_MIX_1[SBOX[(t >>> 16) & 0xff]] ^
                    INV_SUB_MIX_2[SBOX[(t >>> 8) & 0xff]] ^ INV_SUB_MIX_3[SBOX[t & 0xff]];
            }
        }
    }

    protected _doCryptBlock(
        m: number[],
        offset: number,
        keySchedule: number[],
        subMix0: number[],
        subMix1: number[],
        subMix2: number[],
        subMix3: number[],
        sbox: number[]
    ) {
        // Get input, add round key
        let s0 = m[offset] ^ keySchedule[0];
        let s1 = m[offset + 1] ^ keySchedule[1];
        let s2 = m[offset + 2] ^ keySchedule[2];
        let s3 = m[offset + 3] ^ keySchedule[3];

        // Key schedule row counter
        let ksRow = 4;

        // Rounds
        for (let round = 1; round < this._nRounds; round++) {
            // Shift rows, sub bytes, mix columns, add round key
            const t0 = subMix0[s0 >>> 24] ^ subMix1[(s1 >>> 16) & 0xff] ^ subMix2[(s2 >>> 8) & 0xff] ^ subMix3[s3 & 0xff] ^
                keySchedule[ksRow++];
            const t1 = subMix0[s1 >>> 24] ^ subMix1[(s2 >>> 16) & 0xff] ^ subMix2[(s3 >>> 8) & 0xff] ^ subMix3[s0 & 0xff] ^
                keySchedule[ksRow++];
            const t2 = subMix0[s2 >>> 24] ^ subMix1[(s3 >>> 16) & 0xff] ^ subMix2[(s0 >>> 8) & 0xff] ^ subMix3[s1 & 0xff] ^
                keySchedule[ksRow++];
            const t3 = subMix0[s3 >>> 24] ^ subMix1[(s0 >>> 16) & 0xff] ^ subMix2[(s1 >>> 8) & 0xff] ^ subMix3[s2 & 0xff] ^
                keySchedule[ksRow++];

            // Update state
            s0 = t0;
            s1 = t1;
            s2 = t2;
            s3 = t3;
        }

        // Shift rows, sub bytes, add round key
        const t0g = ((sbox[s0 >>> 24] << 24) | (sbox[(s1 >>> 16) & 0xff] << 16) | (sbox[(s2 >>> 8) & 0xff] << 8) | sbox[s3 & 0xff]) ^
            keySchedule[ksRow++];
        const t1g = ((sbox[s1 >>> 24] << 24) | (sbox[(s2 >>> 16) & 0xff] << 16) | (sbox[(s3 >>> 8) & 0xff] << 8) | sbox[s0 & 0xff]) ^
            keySchedule[ksRow++];
        const t2g = ((sbox[s2 >>> 24] << 24) | (sbox[(s3 >>> 16) & 0xff] << 16) | (sbox[(s0 >>> 8) & 0xff] << 8) | sbox[s1 & 0xff]) ^
            keySchedule[ksRow++];
        const t3g = ((sbox[s3 >>> 24] << 24) | (sbox[(s0 >>> 16) & 0xff] << 16) | (sbox[(s1 >>> 8) & 0xff] << 8) | sbox[s2 & 0xff]) ^
            keySchedule[ksRow];

        // Set output
        m[offset] = t0g;
        m[offset + 1] = t1g;
        m[offset + 2] = t2g;
        m[offset + 3] = t3g;
    }
}
