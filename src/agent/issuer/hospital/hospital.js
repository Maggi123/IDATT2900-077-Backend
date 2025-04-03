import express from "express";
import {
  getCheckSmartSessionMiddleware,
  getAllMedicationRequests,
  getMedicationRequest,
} from "./smart.js";
import {
  OpenId4VcIssuanceSessionState,
  OpenId4VcIssuerEvents,
} from "@credo-ts/openid4vc";

export const HOSPITAL_ROUTER_PATH = "/hospital";
const HOSPITAL_PRESCRIPTIONS_PATH = `/prescriptions`;
const RXNORM_SYSTEM_DEFINITION_URL =
  "http://www.nlm.nih.gov/research/umls/rxnorm";

export function setupHospitalIssuerRouter(agent, issuerDid) {
  const router = express.Router();

  const checkSmartSessionMiddleware = getCheckSmartSessionMiddleware(agent);
  router.use(checkSmartSessionMiddleware);

  router.get("/", (req, res) => {
    res.render("hospital/hospital", {
      hospitalPrescriptionsPath:
        HOSPITAL_ROUTER_PATH + HOSPITAL_PRESCRIPTIONS_PATH,
    });
  });

  router.get(HOSPITAL_PRESCRIPTIONS_PATH, async (req, res, next) => {
    try {
      const prescriptions = (await getAllMedicationRequests()).entry;
      const prescriptionResources = prescriptions.map((item) => {
        return item.resource;
      });

      res.render("hospital/hospitalPrescription", {
        prescriptions: prescriptionResources,
        hospitalPath: HOSPITAL_ROUTER_PATH,
        hospitalPrescriptionsPath:
          HOSPITAL_ROUTER_PATH + HOSPITAL_PRESCRIPTIONS_PATH,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get(
    `${HOSPITAL_PRESCRIPTIONS_PATH}/:id/offer`,
    async (req, res, next) => {
      try {
        const offer = await createPrescriptionOffer(
          agent,
          issuerDid,
          req.params.id,
          !isNaN(parseInt(req.query.validity))
            ? parseInt(req.query.validity)
            : 1,
        );

        res.render("hospital/hospitalPrescriptionOffer", {
          offer: offer,
          hospitalPrescriptionsPath:
            HOSPITAL_ROUTER_PATH + HOSPITAL_PRESCRIPTIONS_PATH,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

export async function getPrescriptionClaims(id) {
  const medicationRequest = await getMedicationRequest(id);
  const prescriptionClaims = {};
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

async function getRxNormInName(rxcui) {
  try {
    const response = await fetch(
      `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/allrelated.json`,
    );
    if (response.status === 200) {
      const ingredientNames = (
        await response.json()
      ).allRelatedGroup.conceptGroup
        .filter((item) => {
          return item.tty === "IN";
        })
        .map((item) => {
          return item.conceptProperties[0].name;
        });
      return ingredientNames[0];
    }
  } catch (error) {
    console.error(`Unable to get ingredient for RxCUI ${rxcui}. Error `, error);
  }
  return null;
}

export async function createPrescriptionOffer(
  agent,
  issuerId,
  prescriptionId,
  validity,
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
        validity: validity,
      },
    });

  agent.events.on(
    OpenId4VcIssuerEvents.IssuanceSessionStateChanged,
    function handler(event) {
      if (event.payload.issuanceSession.id === issuanceSession.id) {
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
    },
  );

  return credentialOffer;
}
