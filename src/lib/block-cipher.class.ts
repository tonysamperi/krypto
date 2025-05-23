import {Cipher} from "./cipher.class.js";
import {WordArray} from "./word-array.class.js";
import {BufferedBlockAlgorithmConfig} from "./buffered-block-algorithm-config.interface.js";
import {BlockCipherModeAlgorithm} from "../mode/block-cipher-mode-algorithm.class.js";
import {CBC} from "../mode/cbc/cbc.class.js";
import {PKCS7} from "../pad/pkcs7.class.js";

export abstract class BlockCipher extends Cipher {

    protected _mode: BlockCipherModeAlgorithm;

    constructor(xformMode: number, key: WordArray, cfg?: BufferedBlockAlgorithmConfig) {
        super(xformMode, key, Object.assign({
            // default: 128 / 32
            blockSize: 4,
            mode: CBC,
            padding: PKCS7
        }, cfg));
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    abstract decryptBlock(M: number[], offset: number): void;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    abstract encryptBlock(M: number[], offset: number): void;

    reset() {
        // Reset cipher
        super.reset();

        // Check if we have a blockSize
        if (this.cfg.mode === undefined) {
            throw new Error("missing mode in config");
        }

        // Reset block mode
        let modeCreator;
        if (this._xformMode === (this.constructor as typeof BlockCipher)._ENC_XFORM_MODE) {
            modeCreator = this.cfg.mode.createEncryptor;
        }
        else /* if (this._xformMode == this._DEC_XFORM_MODE) */ {
            modeCreator = this.cfg.mode.createDecryptor;
            // Keep at least one block in the buffer for unpadding
            this._minBufferSize = 1;
        }

        if (this._mode && this._mode.__creator === modeCreator) {
            this._mode.init(this, this.cfg.iv && this.cfg.iv.words);
        }
        else {
            this._mode = modeCreator.call(this.cfg.mode, this, this.cfg.iv && this.cfg.iv.words);
            this._mode.__creator = modeCreator;
        }
    }

    protected _doFinalize() {
        // Check if we have a padding strategy
        if (this.cfg.padding === undefined) {
            throw new Error("missing padding in config");
        }

        // Finalize
        let finalProcessedBlocks;
        if (this._xformMode === (this.constructor as typeof BlockCipher)._ENC_XFORM_MODE) {
            // Check if we have a blockSize
            if (this.cfg.blockSize === undefined) {
                throw new Error("missing blockSize in config");
            }

            // Pad data
            this.cfg.padding.pad(this._data, this.cfg.blockSize);

            // Process final blocks
            finalProcessedBlocks = this._process(!0);
        }
        else /* if (this._xformMode == this._DEC_XFORM_MODE) */ {
            // Process final blocks
            finalProcessedBlocks = this._process(!0);

            // Un-padded data
            this.cfg.padding.unpad(finalProcessedBlocks);
        }

        return finalProcessedBlocks;
    }

    protected _doProcessBlock(words: number[], offset: number) {
        this._mode.processBlock(words, offset);
    }

}
