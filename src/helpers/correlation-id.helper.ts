export const correlationIdHelper = function (): string {
    const now = Date.now().toString(36);

    const cryptoObj = globalThis.crypto;

    if (cryptoObj?.getRandomValues) {
        const arr = new Uint8Array(8);
        cryptoObj.getRandomValues(arr);

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
