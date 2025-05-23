import {WordArray} from "../lib/word-array.class.js";
import {AbstractPadding} from "./padding.model.js";

export class PKCS7 implements AbstractPadding {
    /**
     * Pads data using the algorithm defined in PKCS #5/7.
     *
     * @param data The data to pad.
     * @param blockSize The multiple that the data should be padded to.
     *
     * @example
     *
     *     PKCS7.pad(wordArray, 4);
     */
    static pad(data: WordArray, blockSize: number): void {
        // Shortcut
        const blockSizeBytes = blockSize * 4;

        // Count padding bytes
        const nPaddingBytes = blockSizeBytes - data.sigBytes % blockSizeBytes;

        // Create padding word
        const paddingWord = (nPaddingBytes << 24) | (nPaddingBytes << 16) | (nPaddingBytes << 8) | nPaddingBytes;

        // Create padding
        const paddingWords = [];
        for (let i = 0; i < nPaddingBytes; i += 4) {
            paddingWords.push(paddingWord);
        }
        const padding = new WordArray(paddingWords, nPaddingBytes);

        // Add padding
        data.concat(padding);
    }

    /**
     * Unpads data that had been padded using the algorithm defined in PKCS #5/7.
     *
     * @param data The data to unpad.
     *
     * @example
     *
     *     PKCS7.unpad(wordArray);
     */
    static unpad(data: WordArray): void {
        // Get number of padding bytes from last byte
        const nPaddingBytes = data.words[(data.sigBytes - 1) >>> 2] & 0xff;

        // Remove padding
        data.sigBytes -= nPaddingBytes;
    }
}
