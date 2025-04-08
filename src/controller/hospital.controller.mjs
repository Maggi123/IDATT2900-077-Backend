import express from "express";

import { createPrescriptionOffer } from "#src/service/hospital.service.mjs";
import {
  getCheckSmartSessionMiddleware,
  getAllMedicationRequests,
} from "#src/service/smart.service.mjs";

export const HOSPITAL_ROUTER_PATH = "/hospital";
export const HOSPITAL_PRESCRIPTIONS_PATH = `/prescriptions`;

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
          !isNaN(parseInt(req.query.validityDays))
            ? parseInt(req.query.validityDays)
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
