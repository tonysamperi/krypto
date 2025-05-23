import {WordArray} from "./word-array.class.js";
import {Cipher} from "./cipher.class.js";
import {BufferedBlockAlgorithmConfig} from "./buffered-block-algorithm-config.interface.js";
import {OpenSSL} from "../format/open-ssl.class.js";
import {CipherParams} from "./cipher-params.class.js";
import {Formatter} from "../format/formatter.interface.js";

export class SerializableCipher {
    public static cfg: BufferedBlockAlgorithmConfig = {
        blockSize: 4,
        iv: new WordArray([]),
        format: OpenSSL
    };

    /**
     * Decrypts serialized ciphertext.
     *
     * @param cipher The cipher algorithm to use.
     * @param ciphertext The ciphertext to decrypt.
     * @param key The key.
     * @param optionalCfg The configuration options to use for this operation.
     *
     * @return The plaintext.
     *
     * @example
     *
     *     let plaintext = SerializableCipher.decrypt(
     *         AESAlgorithm,
     *         formattedCiphertext,
     *         key, {
     *             iv: iv,
     *             format: CryptoJS.format.OpenSSL
     *         }
     *     );
     *
     *     let plaintext = SerializableCipher.decrypt(
     *         AESAlgorithm,
     *         ciphertextParams,
     *         key, {
     *             iv: iv,
     *             format: CryptoJS.format.OpenSSL
     *         }
     *     );
     */
    static decrypt(
        cipher: typeof Cipher,
        ciphertext: CipherParams | string,
        key: WordArray | string,
        optionalCfg?: BufferedBlockAlgorithmConfig
    ): WordArray {
        // Apply config defaults
        const cfg = Object.assign({}, this.cfg, optionalCfg);

        if (!cfg.format) {
            throw new Error("could not determine format");
        }

        // Convert string to CipherParams
        ciphertext = this._parse(ciphertext, cfg.format);

        if (!ciphertext.ciphertext) {
            throw new Error("could not determine ciphertext");
        }

        // Decrypt
        return cipher.createDecryptor(key, cfg).finalize(ciphertext.ciphertext);
    }

    /**
     * Encrypts a message.
     *
     * @param cipher The cipher algorithm to use.
     * @param message The message to encrypt.
     * @param key The key.
     * @param cfg (Optional) The configuration options to use for this operation.
     *
     * @return A cipher params object.
     *
     * @example
     *
     *     let ciphertextParams = SerializableCipher.encrypt(CryptoJS.algo.AES, message, key);
     *     let ciphertextParams = SerializableCipher.encrypt(CryptoJS.algo.AES, message, key, { iv: iv });
     *     let ciphertextParams = SerializableCipher.encrypt(CryptoJS.algo.AES, message, key, {
     *       iv: iv,
     *       format: CryptoJS.format.OpenSSL
     *     });
     */
    public static encrypt(
        cipher: typeof Cipher,
        message: WordArray | string,
        key: WordArray | string,
        cfg?: BufferedBlockAlgorithmConfig
    ): CipherParams {
        // Apply config defaults
        const config = Object.assign({}, this.cfg, cfg);

        // Encrypt
        const encryptor = cipher.createEncryptor(key, config);
        const ciphertext = encryptor.finalize(message);

        // Create and return serializable cipher params
        return new CipherParams({
            ciphertext: ciphertext,
            key: key,
            iv: encryptor.cfg.iv,
            algorithm: cipher,
            mode: encryptor.cfg.mode,
            padding: encryptor.cfg.padding,
            blockSize: encryptor.cfg.blockSize,
            formatter: config.format
        });
    }

    /**
     * Converts serialized ciphertext to CipherParams,
     * else assumed CipherParams already and returns ciphertext unchanged.
     *
     * @param ciphertext The ciphertext.
     * @param format The formatting strategy to use to parse serialized ciphertext.
     *
     * @return The deserialized ciphertext.
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
