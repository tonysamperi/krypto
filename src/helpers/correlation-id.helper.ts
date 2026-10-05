const idBytes = 8;
const poolSize = 4096;

let pool: Uint8Array<ArrayBuffer> | null = null;
let poolOffset = 0;

function nextRandomBytes(cryptoObj: Crypto): Uint8Array {
    if (!pool || poolOffset + idBytes > pool.length) {
        pool = new Uint8Array(new ArrayBuffer(poolSize));
        cryptoObj.getRandomValues(pool);
        poolOffset = 0;
    }

    const bytes = pool.subarray(poolOffset, poolOffset + idBytes);
    poolOffset += idBytes;

    return bytes;
}

export const correlationIdHelper = function (): string {
    const now = Date.now().toString(36);

    const cryptoObj = globalThis.crypto;

    if (cryptoObj?.getRandomValues) {
        const arr = nextRandomBytes(cryptoObj);

        let rand = "";
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let i = 0; i < arr.length; i++) {
            const hex = arr[i].toString(16);
            rand += hex.length === 1 ? "0" + hex : hex;
        }

        return now + "-" + rand;
    }

    return now + "-" + Math.random().toString(36).slice(2, 10);
};
