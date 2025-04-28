import {
  OpenId4VcVerificationSessionState,
  OpenId4VcVerifierEvents,
} from "@credo-ts/openid4vc";
import { asArray } from "@credo-ts/core";

/** @module service/hospital-verifier */

/**
 * Creates a prescription verification request.
 *
 * @param agent the agent to use for creating the request.
 * @param verifierId the DID of the verifier.
 * @returns {Promise<string[]>} the authorization request URI and verification session id.
 */
export async function createPrescriptionVerificationRequest(agent, verifierId) {
  const { authorizationRequest, verificationSession } =
    await agent.modules.openid4VcVerifier.createAuthorizationRequest({
      verifierId: verifierId,
      requestSigner: {
        didUrl: `${verifierId}#key-1`,
        method: "did",
      },
      // The version of the OpenID for Verifiable Presentations specification to use.
      // Setting draft version 21 ensures that the verifier can verify a presentation from the wallet application.
      // Draft version 24 is also supported, but it is not supported by the wallet application.
      version: "v1.draft21",
      // A DIF Presentation Exchange definition for the prescription verification.
      // See https://identity.foundation/presentation-exchange/spec/v2.0.0/ for more information.
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

/**
 * Constructs a handler function logs state changes of the verification session.
 * The handler also signals the end of the verification process by sending an SSE with the provided response object.
 * The SSE includes the names of the prescription that were verified.
 * THe handler function is automatically unregistered when the verification session is completed.
 *
 * @param agent the agent to use for logging.
 * @param id the verification session id.
 * @param res the response object to use for sending the SSE.
 * @returns {Promise<(function(*): Promise<void>)>} the handler function.
 */
export async function getPrescriptionVerificationSessionStateChangeHandler(
  agent,
  id,
  res,
) {
  return async function handler(event) {
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

        const verifiablePresentations =
          verifiedAuthorizationResponse.presentationExchange.presentations;

        const data =
          convertPrescriptionVerifiablePresentationToPrescriptionNames(
            verifiablePresentations[0],
          );

        res.write("event: verificationCompleted\n");
        res.write(`data: ${data}\n\n`);

        agent.events.off(
          OpenId4VcVerifierEvents.VerificationSessionStateChanged,
          handler,
        );
        res.end();
      }
    }
  };
}

/**
 * Converts a verifiable presentation containing prescriptions to a string containing the names of the prescriptions.
 *
 * @param prescriptionPresentation the verifiable presentation containing the prescriptions.
 * @returns {string} the names of the prescriptions.
 */
export function convertPrescriptionVerifiablePresentationToPrescriptionNames(
  prescriptionPresentation,
) {
  const credentials = asArray(prescriptionPresentation.verifiableCredential);

  const prescriptionNames = credentials
    .filter((credential) => credential.type.includes("Prescription"))
    .map((credential) => asArray(credential.credentialSubject)[0].claims.name);

  return prescriptionNames.join(", ");
}
