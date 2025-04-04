import {
  getMedicationRequest,
  getAllMedicationRequests,
  setFhirClient,
} from "../src/service/smart.service.mjs";

describe("smart tests", () => {
  const fhirClientMock = {
    request: vi.fn(),
  };

  afterEach(() => {
    setFhirClient(undefined);
    vi.resetAllMocks();
  });

  describe("getMedicationRequest", () => {
    it("should try to fetch data with id", async () => {
      setFhirClient(fhirClientMock);

      await getMedicationRequest(100);

      expect(fhirClientMock.request).toHaveBeenCalledTimes(1);
      expect(fhirClientMock.request).toHaveBeenCalledWith(
        "MedicationRequest/100",
      );
    });

    it("should throw when fhirClient is undefined", async () => {
      await expect(getMedicationRequest(100)).rejects.toThrow();
    });
  });

  describe("getAllMedicationRequests", () => {
    it("should try to fetch data", async () => {
      setFhirClient(fhirClientMock);

      await getAllMedicationRequests();

      expect(fhirClientMock.request).toHaveBeenCalledTimes(1);
      expect(fhirClientMock.request).toHaveBeenCalledWith("MedicationRequest");
    });

    it("should throw when fhirClient is undefined", async () => {
      await expect(getAllMedicationRequests()).rejects.toThrow();
    });
  });
});
