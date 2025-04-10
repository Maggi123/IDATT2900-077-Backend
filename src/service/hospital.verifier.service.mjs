import {
  OpenId4VcVerificationSessionState,
  OpenId4VcVerifierEvents,
} from "@credo-ts/openid4vc";

export async function createPrescriptionVerificationRequest(agent, verifierId) {
  const { authorizationRequest, verificationSession } =
    await agent.modules.openid4VcVerifier.createAuthorizationRequest({
      verifierId: verifierId,
      requestSigner: {
        didUrl: `${verifierId}#key-1`,
        method: "did",
      },
      presentationExchange: {
        definition: {
          id: "hospital_prescription_verification",
          input_descriptors: [
            {
              id: "Prescription",
              name: "Prescription",
              purpose:
                "We need to verify your prescriptions to dispense medications",
              constraints: {
                fields: [
                  {
                    path: ["$.type"],
                    filter: {
                      type: "array",
                      contains: {
                        type: "string",
                        pattern: "^Prescription",
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    });

  const handler = async (event) => {
    if (event.payload.verificationSession.id === verificationSession.id) {
      agent.config.logger.info(
        "Verification session state changed to ",
        event.payload.verificationSession.state,
      );
      if (
        event.payload.verificationSession.state ===
        OpenId4VcVerificationSessionState.ResponseVerified
      ) {
        const verifiedAuthorizationResponse =
          await agent.modules.openId4VcVerifier.getVerifiedAuthorizationResponse(
            verificationSession.id,
          );
        console.log(
          "Successfully verified presentation.",
          JSON.stringify(verifiedAuthorizationResponse, null, 2),
        );

        agent.events.off(
          OpenId4VcVerifierEvents.VerificationSessionStateChanged,
          handler,
        );
      }
    }
  };

  agent.events.on(
    OpenId4VcVerifierEvents.VerificationSessionStateChanged,
    handler,
  );

  return authorizationRequest;
}
