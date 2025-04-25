import { LogLevel } from "@credo-ts/core";

import {
  getMedicationRequest,
  getAllMedicationRequests,
  setFhirClient,
  getCheckSmartSessionMiddleware,
} from "#src/service/smart.service.mjs";
import { SMART_ROUTER_PATH } from "#src/controller/smart.controller.mjs";
import { getSimpleAgentMock } from "../helpers/mockAgent.mjs";

describe("smart service tests", () => {
  const fhirClientMock = {
    request: vi.fn(),
    getState: vi.fn(),
  };

  const simpleAgentMock = getSimpleAgentMock(LogLevel.off);

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

  describe("getCheckSmartSessionMiddleware", () => {
    const requestObjectMock = vi.fn();
    const responseObjectMock = vi.fn();
    responseObjectMock.redirect = vi.fn();
    const nextFunctionMock = vi.fn();

    it("should return middleware that redirects to root page when fhirClient is undefined", () => {
      const middleware = getCheckSmartSessionMiddleware(simpleAgentMock);

      middleware(requestObjectMock, responseObjectMock, nextFunctionMock);

      expect(responseObjectMock.redirect).toHaveBeenCalledTimes(1);
      expect(responseObjectMock.redirect).toHaveBeenCalledWith("/");
    });

    it("should return middleware that redirects to session expired page when smart session has expired", () => {
      fhirClientMock.getState.mockReturnValue({
        expiresAt: 0,
      });
      setFhirClient(fhirClientMock);

      const middleware = getCheckSmartSessionMiddleware(simpleAgentMock);

      middleware(requestObjectMock, responseObjectMock, nextFunctionMock);

      expect(responseObjectMock.redirect).toHaveBeenCalledTimes(1);
      expect(responseObjectMock.redirect).toHaveBeenCalledWith(
        `${SMART_ROUTER_PATH}/session_expired`,
      );
    });

    it("should return middleware that calls next function when smart session has not expired", () => {
      fhirClientMock.getState.mockReturnValue({
        expiresAt: Number.MAX_VALUE,
      });
      setFhirClient(fhirClientMock);

      const middleware = getCheckSmartSessionMiddleware(simpleAgentMock);

      middleware(requestObjectMock, responseObjectMock, nextFunctionMock);

      expect(responseObjectMock.redirect).toHaveBeenCalledTimes(0);
      expect(nextFunctionMock).toHaveBeenCalledTimes(1);
    });
  });
});
