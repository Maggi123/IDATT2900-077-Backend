import { getRxNormInName } from "../../src/util/prescriptionUtil.mjs";
import { rxNormSampleResponseData } from "../__data__/rxNormSampleData.mjs";

describe("prescription util tests", () => {
  describe("getRxNormInName", () => {
    it("should return active ingredient when fetch is successful", async () => {
      global.fetch = vi.fn(async () => {
        return new Response(JSON.stringify(rxNormSampleResponseData), {
          status: 200,
        });
      });

      const result = await getRxNormInName(310965);

      expect(result).toBe("ibuprofen");
    });

    it("should return null and log error when fetch fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error");

      global.fetch = vi.fn(async () => {
        throw new Error();
      });

      const result = await getRxNormInName(1);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });
});
