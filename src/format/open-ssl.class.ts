import {CipherParams} from "../lib/cipher-params.class.js";
import {WordArray} from "../lib/word-array.class.js";
import {Base64} from "../enc/base64.class.js";

export class OpenSSL {

    /**
     * Converts an OpenSSL-compatible string to a cipher params object.
     *
     * @param openSSLStr The OpenSSL-compatible string.
     *
     * @return The cipher params object.
     *
     * @example
     *
     *     let cipherParams = OpenSSLFormatter.parse(openSSLString);
     */
    static parse(openSSLStr: string): CipherParams {
        // Parse base64
        const ciphertext = Base64.parse(openSSLStr);

        // Test for salt
        let salt: WordArray | undefined;
        if (ciphertext.words[0] === 0x53616c74 && ciphertext.words[1] === 0x65645f5f) {
            // Extract salt
            salt = new WordArray(ciphertext.words.slice(2, 4));

            // Remove salt from ciphertext
            ciphertext.words.splice(0, 4);
            ciphertext.sigBytes -= 16;
        }

        return new CipherParams({ciphertext: ciphertext, salt: salt});
    }

    /**
     * Converts a cipher params object to an OpenSSL-compatible string.
     *
     * @param cipherParams The cipher params object.
     *
     * @return The OpenSSL-compatible string.
     *
     * @example
     *
     *     let openSSLString = OpenSSLFormatter.stringify(cipherParams);
     */
    public static stringify(cipherParams: CipherParams): string {
        if (!cipherParams.ciphertext) {
            throw new Error("missing ciphertext in params");
        }

        // Shortcuts
        const ciphertext = cipherParams.ciphertext;
        const salt = cipherParams.salt;

        // Format
        let wordArray: WordArray;
        if (salt) {
            if (typeof salt === "string") {
                throw new Error("salt is expected to be a WordArray");
            }

            wordArray = (new WordArray([0x53616c74, 0x65645f5f])).concat(salt).concat(ciphertext);
        }
        else {
            wordArray = ciphertext;
        }

        return wordArray.toString(Base64);
    }

}
