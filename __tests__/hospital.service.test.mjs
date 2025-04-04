import { sampleMedicationRequest } from "./__data__/smartSampleData.mjs";
import { getPrescriptionClaims } from "../src/service/hospital.service.mjs";

describe("hospital tests", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getPrescriptionClaims", () => {
    vi.mock("../src/util/prescriptionUtil.mjs", () => ({
      getRxNormInName: vi.fn().mockResolvedValue(null),
    }));

    vi.mock("../src/service/smart.service.mjs", () => ({
      getMedicationRequest: vi.fn().mockImplementation(async (id) => {
        if (`${id}` === sampleMedicationRequest.id)
          return sampleMedicationRequest;
        throw new Error();
      }),
    }));

    it("should return claims with valid id", async () => {
      const claims = await getPrescriptionClaims(100);

      expect(claims).toStrictEqual({
        name: sampleMedicationRequest.medicationCodeableConcept.text,
        authoredOn: sampleMedicationRequest.authoredOn,
        activeIngredient: undefined,
      });
    });

    it("should throw when id is not valid", async () => {
      await expect(getPrescriptionClaims(1)).rejects.toThrow();
    });
  });
});
