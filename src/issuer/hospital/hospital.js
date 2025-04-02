import express from "express";
import {
  checkSmartSession,
  getAllMedicationRequests,
  getMedicationRequest,
} from "./fhir.js";
import { createPrescriptionOffer } from "../../agent.js";

const rxnormSystem = "http://www.nlm.nih.gov/research/umls/rxnorm";

export function setupHospitalIssuerRouter(agent, issuerDid) {
  const router = express.Router();

  router.use(checkSmartSession);

  router.get("/", (req, res) => {
    res.render("hospital/hospital");
  });

  router.get("/prescriptions", async (req, res, next) => {
    try {
      const prescriptions = (await getAllMedicationRequests()).entry;
      const prescriptionResources = prescriptions.map((item) => {
        return item.resource;
      });

      res.render("hospital/hospitalPrescription", {
        prescriptions: prescriptionResources,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/prescriptions/:id/offer", async (req, res, next) => {
    try {
      const offer = await createPrescriptionOffer(
        agent,
        issuerDid,
        req.params.id,
        !isNaN(parseInt(req.query.validity)) ? parseInt(req.query.validity) : 1,
      );

      res.render("hospital/hospitalPrescriptionOffer", {
        offer: offer,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export async function getPrescriptionClaims(id) {
  const medicationRequest = await getMedicationRequest(id);
  const prescriptionClaims = {};
  if (medicationRequest.medicationCodeableConcept.coding.length > 0) {
    for (const item of medicationRequest.medicationCodeableConcept.coding) {
      if (item.system === rxnormSystem)
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
