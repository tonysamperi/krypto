import {uuidV4Helper} from "../../src/helpers/uuid-v4.helper";

describe("uuidV4Helper", () => {

    const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    it("should generate a valid version 4, variant RFC 4122 UUID", () => {
        const id = uuidV4Helper();

        expect(id).toMatch(UUID_V4_REGEX);
    });

    it.skip("should not generate collisions in 1 million ids", () => {
        const set = new Set<string>();

        const total = 1_000_000;

        for (let i = 0; i < total; i++) {
            const id = uuidV4Helper();

            if (set.has(id)) {
                throw new Error(`Collision detected at iteration ${i}: ${id}`);
            }

            set.add(id);
        }

        expect(set.size).toBe(total);
    });

    it("should generate 100k ids under reasonable time", () => {
        const start = Date.now();

        for (let i = 0; i < 100_000; i++) {
            uuidV4Helper();
        }

        const took = Date.now() - start;

        console.log("Generated in ms:", took);

        expect(took).toBeLessThan(5_000);
    });
});
