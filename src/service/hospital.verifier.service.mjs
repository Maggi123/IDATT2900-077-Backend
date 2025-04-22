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

  return [authorizationRequest, verificationSession.id];
}

export async function registerSseEventListenerOnPrescriptionVerificationSession(
  agent,
  id,
  res,
) {
  const handler = async (event) => {
    if (event.payload.verificationSession.id === id) {
      agent.config.logger.info(
        "Verification session state changed to ",
        event.payload.verificationSession.state,
      );
      if (
        event.payload.verificationSession.state ===
        OpenId4VcVerificationSessionState.ResponseVerified
      ) {
        const verifiedAuthorizationResponse =
          await agent.modules.openid4VcVerifier.getVerifiedAuthorizationResponse(
            id,
          );
        agent.config.logger.info(
          "Successfully verified presentation.",
          verifiedAuthorizationResponse,
        );

        res.write("event: verificationCompleted\n");
        res.write(`data: ${JSON.stringify(verifiedAuthorizationResponse)}\n\n`);

        agent.events.off(
          OpenId4VcVerifierEvents.VerificationSessionStateChanged,
          handler,
        );
        res.end();
      }
    }
  };

  agent.events.on(
    OpenId4VcVerifierEvents.VerificationSessionStateChanged,
    handler,
  );

  return handler;
}
