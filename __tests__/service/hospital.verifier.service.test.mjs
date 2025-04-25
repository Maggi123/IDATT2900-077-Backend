import {
  OpenId4VcVerificationSessionRecord,
  OpenId4VcVerificationSessionState,
  OpenId4VcVerifierEvents,
} from "@credo-ts/openid4vc";
import { LogLevel } from "@credo-ts/core";
import {
  convertPrescriptionVerifiablePresentationToPrescriptionNames,
  createPrescriptionVerificationRequest,
  getPrescriptionVerificationSessionStateChangeHandler,
} from "#src/service/hospital.verifier.service.mjs";
import { getSimpleAgentMock } from "../helpers/mockAgent.mjs";

describe("hospital verifier service tests", () => {
  const simpleAgentMock = getSimpleAgentMock(LogLevel.off);

  const mockPresentation = {
    verifiableCredential: [
      {
        type: ["Prescription"],
        credentialSubject: {
          claims: {
            name: "name",
          },
        },
      },
    ],
  };

  const loggerInfoMock = vi.spyOn(simpleAgentMock.config.logger, "info");

  const responseMock = vi.fn();
  responseMock.write = vi.fn();
  responseMock.end = vi.fn();

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("createPrescriptionVerificationRequest", () => {
    it("should create prescription verification request", async () => {
      const createAuthorizationRequestMock = vi.spyOn(
        simpleAgentMock.modules.openid4VcVerifier,
        "createAuthorizationRequest",
      );

      const eventOnMock = vi.spyOn(simpleAgentMock.events, "on");

      createAuthorizationRequestMock.mockResolvedValue({
        authorizationRequest: "authorization-request",
        verificationSession: new OpenId4VcVerificationSessionRecord({
          id: "id",
          verifierId: "verifier",
          state: OpenId4VcVerificationSessionState.RequestCreated,
          authorizationRequestId: "id",
          expiresAt: new Date(),
        }),
      });
      eventOnMock.mockImplementation(vi.fn());

      const result = await createPrescriptionVerificationRequest(
        simpleAgentMock,
        "verifier",
      );

      expect(result).toEqual(["authorization-request", "id"]);
      expect(createAuthorizationRequestMock).toHaveBeenCalledTimes(1);
      expect(createAuthorizationRequestMock).toHaveBeenCalledWith({
        verifierId: "verifier",
        requestSigner: {
          didUrl: `verifier#key-1`,
          method: "did",
        },
        version: "v1.draft21",
        presentationExchange: {
          definition: {
            id: "hospital_prescription_verification",
            name: "Hospital Prescription Verification",
            purpose:
              "We need to verify your prescriptions to dispense medications.",
            input_descriptors: [
              {
                id: "PrescriptionDescriptor",
                name: "Prescription",
                constraints: {
                  fields: [
                    {
                      path: ["$.type", "$.vc.type.*", "$.vct"],
                      filter: {
                        type: "string",
                        pattern: "Prescription",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      });
      expect(eventOnMock).toHaveBeenCalledTimes(0);
    });
  });

  describe("getPrescriptionVerificationSessionStateChangeHandler", () => {
    it("should return function", async () => {
      const handlerFunction =
        await getPrescriptionVerificationSessionStateChangeHandler(
          simpleAgentMock,
          "id",
          responseMock,
        );

      expect(typeof handlerFunction).toEqual("function");
    });

    it("should return handler function that logs state change when event verification session id is equal to id parameter", async () => {
      const handlerFunction =
        await getPrescriptionVerificationSessionStateChangeHandler(
          simpleAgentMock,
          "id",
          responseMock,
        );

      const mockEvent = {
        payload: {
          verificationSession: {
            id: "id",
            state: OpenId4VcVerificationSessionState.RequestCreated,
          },
        },
      };

      await handlerFunction(mockEvent);

      expect(typeof handlerFunction).toEqual("function");
      expect(loggerInfoMock).toHaveBeenCalledTimes(1);
      expect(loggerInfoMock).toHaveBeenCalledWith(
        `Verification session state changed to `,
        OpenId4VcVerificationSessionState.RequestCreated,
      );
    });

    it("should return handler function that writes an SSE to response object and removes event listener when verification session is done", async () => {
      const eventOffMock = vi.spyOn(simpleAgentMock.events, "off");
      const getVerifiedAuthorizationResponseMock = vi.spyOn(
        simpleAgentMock.modules.openid4VcVerifier,
        "getVerifiedAuthorizationResponse",
      );
      getVerifiedAuthorizationResponseMock.mockResolvedValue({
        presentationExchange: {
          presentations: [mockPresentation],
        },
      });

      const handlerFunction =
        await getPrescriptionVerificationSessionStateChangeHandler(
          simpleAgentMock,
          "id",
          responseMock,
        );

      const mockEvent = {
        payload: {
          verificationSession: {
            id: "id",
            state: OpenId4VcVerificationSessionState.ResponseVerified,
          },
        },
      };

      await handlerFunction(mockEvent);

      expect(loggerInfoMock).toHaveBeenCalledTimes(2);
      expect(eventOffMock).toHaveBeenCalledTimes(1);
      expect(eventOffMock).toHaveBeenCalledWith(
        OpenId4VcVerifierEvents.VerificationSessionStateChanged,
        handlerFunction,
      );
      expect(responseMock.write).toHaveBeenCalledTimes(2);
      expect(responseMock.write).toHaveBeenCalledWith(
        "event: verificationCompleted\n",
      );
      expect(responseMock.write).toHaveBeenCalledWith(`data: name\n\n`);
      expect(responseMock.end).toHaveBeenCalledTimes(1);
    });
  });

  describe("convertPrescriptionVerifiablePresentationToPrescriptionNames", () => {
    it("should return string with prescription names when the presentation contains prescriptions", () => {
      const string =
        convertPrescriptionVerifiablePresentationToPrescriptionNames(
          mockPresentation,
        );

      expect(string).toEqual("name");
    });

    it("should return empty string when the presentation contains no prescriptions", () => {
      const mockPresentation = {
        verifiableCredential: [
          {
            type: ["Credential"],
          },
        ],
      };

      const string =
        convertPrescriptionVerifiablePresentationToPrescriptionNames(
          mockPresentation,
        );

      expect(string).toEqual("");
    });
  });
});
