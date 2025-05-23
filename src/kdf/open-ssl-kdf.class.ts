import {WordArray} from "../lib/word-array.class.js";
import {CipherParams} from "../lib/cipher-params.class.js";
import {EVPKDF} from "./evpkdf.class.js";
import {AbstractKDF} from "./kdf.model.js";

export class OpenSSLKdf implements AbstractKDF {
    /**
     * Derives a key and IV from a password.
     *
     * @param password The password to derive from.
     * @param keySize The size in words of the key to generate.
     * @param ivSize The size in words of the IV to generate.
     * @param salt (Optional) A 64-bit salt to use. If omitted, a salt will be generated randomly.
     *
     * @return A cipher params object with the key, IV, and salt.
     *
     * @example
     *
     *     let derivedParams = OpenSSL.execute('Password', 256/32, 128/32);
     *     let derivedParams = OpenSSL.execute('Password', 256/32, 128/32, 'saltsalt');
     */
    static execute(password: string, keySize: number, ivSize: number, salt?: WordArray | string): CipherParams {
        // Generate random salt
        if (!salt) {
            salt = WordArray.random(64 / 8);
        }

        // Derive key and IV
        const key = (new EVPKDF({keySize: keySize + ivSize})).compute(password, salt);

        // Separate key and IV
        const iv = new WordArray(key.words.slice(keySize), ivSize * 4);
        key.sigBytes = keySize * 4;

        // Return params
        return new CipherParams({key: key, iv: iv, salt: salt});
    }

}
