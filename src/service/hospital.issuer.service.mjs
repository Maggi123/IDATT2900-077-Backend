import {
  OpenId4VcIssuanceSessionState,
  OpenId4VcIssuerEvents,
} from "@credo-ts/openid4vc";

import { getRxNormInName } from "#src/util/prescriptionUtil.mjs";
import { getMedicationRequest } from "#src/service/smart.service.mjs";

const RXNORM_SYSTEM_DEFINITION_URL =
  "http://www.nlm.nih.gov/research/umls/rxnorm";

/**
 * Fetches the prescription claims corresponding to the MedicationRequest with the given id.
 *
 * @param id The id of the MedicationRequest.
 * @returns the prescription claims.
 */
export async function getPrescriptionClaims(id) {
  const prescriptionClaims = {};

  const medicationRequest = await getMedicationRequest(id);

  // Fetch the active ingredient from RxNorm if available.
  if (medicationRequest.medicationCodeableConcept.coding.length > 0) {
    for (const item of medicationRequest.medicationCodeableConcept.coding) {
      if (item.system === RXNORM_SYSTEM_DEFINITION_URL)
        prescriptionClaims.activeIngredient =
          (await getRxNormInName(item.code)) ?? undefined;
    }
  }
  prescriptionClaims.name = medicationRequest.medicationCodeableConcept.text;
  prescriptionClaims.authoredOn = medicationRequest.authoredOn;

  return prescriptionClaims;
}

/**
 * Creates a credential offer for a prescription.
 *
 * @param agent The agent to use for issuing the credential.
 * @param issuerId the DID of the issuer.
 * @param prescriptionId the MedicationRequest id of the prescription.
 * @param validityDays the validity of the credential in days.
 * @param recipientDid the DID of the recipient.
 * @returns {Promise<string>} the credential offer URI.
 */
export async function createPrescriptionOffer(
  agent,
  issuerId,
  prescriptionId,
  validityDays,
  recipientDid,
) {
  const { credentialOffer, issuanceSession } =
    await agent.modules.openid4VcIssuer.createCredentialOffer({
      issuerId: issuerId,
      offeredCredentials: ["Prescription"],
      preAuthorizedCodeFlowConfig: {
        userPinRequired: false,
      },
      issuanceMetadata: {
        prescriptionId: prescriptionId,
        validityDays: validityDays,
        recipientDid: recipientDid,
      },
    });

  agent.events.on(
    OpenId4VcIssuerEvents.IssuanceSessionStateChanged,
    getIssuanceSessionStateChangedEventHandlerForIssuanceSession(
      agent,
      issuanceSession.id,
    ),
  );

  return credentialOffer;
}

/**
 * Constructs a handler function that logs state changes of the issuance session with the given id.
 * The handler is automatically removed when the issuance session is completed.
 *
 * @param agent The agent to use for logging.
 * @param issuanceSessionId The id of the issuance session.
 * @returns the handler function.
 */
export function getIssuanceSessionStateChangedEventHandlerForIssuanceSession(
  agent,
  issuanceSessionId,
) {
  return function handler(event) {
    if (event.payload.issuanceSession.id === issuanceSessionId) {
      agent.config.logger.info(
        "Issuance session state changed to ",
        event.payload.issuanceSession.state,
      );
      if (
        event.payload.issuanceSession.state ===
        OpenId4VcIssuanceSessionState.Completed
      ) {
        agent.config.logger.info(
          `Removing listener from issuanceSession with id: ${event.payload.issuanceSession.id}`,
        );
        agent.events.off(
          OpenId4VcIssuerEvents.IssuanceSessionStateChanged,
          handler,
        );
      }
    }
  };
}

/**
 * The display name metadata for the hospital issuer.
 */
export const hospitalDisplay = [
  {
    name: "Hospital",
    description: "A hospital",
    text_color: "#ABCDEF",
    background_color: "#FFFF00",
  },
];
