import {WordArray} from "../lib/word-array.class.js";

export class Latin1 {

    /**
     * Converts a Latin1 string to a word array.
     *
     * @param latin1Str The Latin1 string.
     *
     * @return The word array.
     *
     * @example
     *
     *     let wordArray = Latin1.parse(latin1String);
     */
    static parse(latin1Str: string): WordArray {
        // Shortcut
        const latin1StrLength = latin1Str.length;

        // Convert
        const words: number[] = [];
        for (let i = 0; i < latin1StrLength; i++) {
            words[i >>> 2] |= (latin1Str.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
        }

        return new WordArray(words, latin1StrLength);
    }

    /**
     * Converts a word array to a Latin1 string.
     *
     * @param wordArray The word array.
     *
     * @return The Latin1 string.
     *
     * @example
     *
     *     let latin1String = Latin1.stringify(wordArray);
     */
    static stringify(wordArray: WordArray): string {
        // Convert
        const latin1Chars = [];
        for (let i = 0; i < wordArray.sigBytes; i++) {
            const bite = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
            latin1Chars.push(String.fromCharCode(bite));
        }

        return latin1Chars.join("");
    }

}
