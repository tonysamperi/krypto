import {correlationIdHelper} from "../../src/helpers/correlation-id.helper";

describe("correlationIdHelper", () => {

    it.skip("should not generate collisions in 1 million ids", () => {
        const set = new Set<string>();

        const total = 1_000_000;

        for (let i = 0; i < total; i++) {
            const id = correlationIdHelper();

            if (set.has(id)) {
                throw new Error(`Collision detected at iteration ${i}: ${id}`);
            }

            set.add(id);
        }

        expect(set.size).toBe(total);
    });

    it("should generate 500k ids under reasonable time", () => {
        const start = Date.now();

        for (let i = 0; i < 500_000; i++) {
            correlationIdHelper();
        }

        const took = Date.now() - start;

        console.log("Generated in ms:", took);

        expect(took).toBeLessThan(1000);
    });
});
