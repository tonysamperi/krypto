import {SerializableCipher} from "./serializable-cipher.class.js";
import {WordArray} from "./word-array.class.js";
import {Cipher} from "./cipher.class.js";
import {BufferedBlockAlgorithmConfig} from "./buffered-block-algorithm-config.interface.js";
import {OpenSSL} from "../format/open-ssl.class.js";
import {CipherParams} from "./cipher-params.class.js";
import {Formatter} from "../format/formatter.interface.js";
import {OpenSSLKdf} from "../kdf/open-ssl-kdf.class.js";

export class PasswordBasedCipher {

    static cfg: BufferedBlockAlgorithmConfig = {
        blockSize: 4,
        iv: new WordArray([]),
        format: OpenSSL,
        kdf: OpenSSLKdf
    };

    /**
     * Decrypts serialized ciphertext using a password.
     *
     * @param cipher The cipher algorithm to use.
     * @param ciphertext The ciphertext to decrypt.
     * @param password The password.
     * @param cfg (Optional) The configuration options to use for this operation.
     *
     * @return The plaintext.
     *
     * @example
     *
     *     var plaintext = PasswordBasedCipher.decrypt(AES, formattedCiphertext, 'password', { format: OpenSSL });
     *     var plaintext = PasswordBasedCipher.decrypt(AES, ciphertextParams, 'password', { format: OpenSSL });
     */
    static decrypt(
        cipher: typeof Cipher,
        ciphertext: CipherParams | string,
        password: string,
        cfg?: BufferedBlockAlgorithmConfig
    ): WordArray {
        // Apply config defaults
        const config = Object.assign({}, this.cfg, cfg);

        // Check if we have a kdf
        if (config.format === undefined) {
            throw new Error("missing format in config");
        }

        // Convert string to CipherParams
        ciphertext = this._parse(ciphertext, config.format);

        // Check if we have a kdf
        if (config.kdf === undefined) {
            throw new Error("the key derivation function must be set");
        }

        // Derive key and other params
        const derivedParams = config.kdf.execute(password, cipher.keySize, cipher.ivSize, ciphertext.salt);

        // Check if we have an IV
        if (derivedParams.iv !== undefined) {
            // Add IV to config
            config.iv = derivedParams.iv;
        }

        // Decrypt
        return SerializableCipher.decrypt.call(this, cipher, ciphertext, derivedParams.key, config);
    }

    /**
     * Encrypts a message using a password.
     *
     * @param cipher The cipher algorithm to use.
     * @param message The message to encrypt.
     * @param password The password.
     * @param cfg (Optional) The configuration options to use for this operation.
     *
     * @return A cipher params object.
     *
     * @example
     *
     *     var ciphertextParams = CryptoJS.lib.PasswordBasedCipher.encrypt(AES, message, 'password');
     *     var ciphertextParams = CryptoJS.lib.PasswordBasedCipher.encrypt(AES, message, 'password', { format: OpenSSL });
     */
    static encrypt(
        cipher: typeof Cipher,
        message: WordArray | string,
        password: string,
        cfg?: BufferedBlockAlgorithmConfig
    ): CipherParams {
        // Apply config defaults
        const config = Object.assign({}, this.cfg, cfg);

        // Check if we have a kdf
        if (config.kdf === undefined) {
            throw new Error("missing kdf in config");
        }

        // Derive key and other params
        const derivedParams: CipherParams = config.kdf.execute(password, cipher.keySize, cipher.ivSize);

        // Check if we have an IV
        if (derivedParams.iv !== undefined) {
            // Add IV to config
            config.iv = derivedParams.iv;
        }

        // Encrypt
        const ciphertext: CipherParams = SerializableCipher.encrypt.call(this, cipher, message, derivedParams.key, config);

        // Mix in derived params
        return ciphertext.extend(derivedParams);
    }

    /**
     * Converts serialized ciphertext to CipherParams,
     * else assumed CipherParams already and returns ciphertext unchanged.
     *
     * @param ciphertext The ciphertext.
     * @param format The formatting strategy to use to parse serialized ciphertext.
     *
     * @return The unserialized ciphertext.
     *
     * @example
     *
     *     var ciphertextParams = CryptoJS.lib.SerializableCipher._parse(ciphertextStringOrParams, format);
     */
    protected static _parse(ciphertext: CipherParams | string, format: Formatter): CipherParams {
        if (typeof ciphertext === "string") {
            return format.parse(ciphertext);
        }
        else {
            return ciphertext;
        }
    }
}
