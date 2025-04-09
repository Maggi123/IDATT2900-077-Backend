import {
  OpenId4VcVerificationSessionRecord,
  OpenId4VcVerificationSessionState,
  OpenId4VcVerifierApi,
} from "@credo-ts/openid4vc";
import { EventEmitter } from "@credo-ts/core";
import { agentDependencies } from "@credo-ts/node";
import { createPrescriptionVerificationRequest } from "#src/service/hospital.verifier.service.mjs";

describe("hospital verifier service tests", () => {
  describe("createPrescriptionVerificationRequest", () => {
    const simpleAgentMock = {
      modules: {
        openid4VcVerifier: new OpenId4VcVerifierApi(
          undefined,
          undefined,
          undefined,
        ),
      },
      events: new EventEmitter(agentDependencies, undefined),
    };

    it("should create prescription verification request", async () => {
      const createAuthorizationRequestMock = vi.spyOn(
        simpleAgentMock.modules.openid4VcVerifier,
        "createAuthorizationRequest",
      );

      const eventOnMock = vi.spyOn(simpleAgentMock.events, "on");

      createAuthorizationRequestMock.mockResolvedValue({
        authorizationRequest: "authorization-request",
        verificationSession: new OpenId4VcVerificationSessionRecord({
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

      expect(result).toEqual("authorization-request");
      expect(createAuthorizationRequestMock).toHaveBeenCalledTimes(1);
      expect(createAuthorizationRequestMock).toHaveBeenCalledWith({
        verifierId: "verifier",
        requestSigner: {
          didUrl: `verifier#key-1`,
          method: "did",
        },
        presentationExchange: {
          definition: {
            id: "Hospital Prescription Verification",
            purpose:
              "We need to verify your prescriptions to dispense medications",
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
      expect(eventOnMock).toHaveBeenCalledTimes(1);
    });
  });
});
