import express from "express";
import QRCode from "qrcode";

import { createPrescriptionOffer } from "#src/service/hospital.issuer.service.mjs";
import {
  getCheckSmartSessionMiddleware,
  getAllMedicationRequests,
  getMedicationRequest,
} from "#src/service/smart.service.mjs";

export const HOSPITAL_ISSUER_ROUTER_PATH = "/issuer/hospital";
export const HOSPITAL_ISSUER_PRESCRIPTIONS_PATH = `/prescriptions`;

export function setupHospitalIssuerRouter(agent, issuerDid) {
  const router = express.Router();

  const checkSmartSessionMiddleware = getCheckSmartSessionMiddleware(agent);
  router.use(checkSmartSessionMiddleware);

  router.get("/", (req, res) => {
    res.render("hospital/issuer/hospitalIssuer", {
      hospitalIssuePrescriptionsPath:
        HOSPITAL_ISSUER_ROUTER_PATH + HOSPITAL_ISSUER_PRESCRIPTIONS_PATH,
    });
  });

  router.get(HOSPITAL_ISSUER_PRESCRIPTIONS_PATH, async (req, res, next) => {
    try {
      const prescriptions = (await getAllMedicationRequests()).entry;
      const prescriptionResources = prescriptions.map((item) => {
        return item.resource;
      });

      res.render("hospital/issuer/hospitalIssuerPrescription", {
        prescriptions: prescriptionResources,
        hospitalIssuerPath: HOSPITAL_ISSUER_ROUTER_PATH,
        hospitalIssuePrescriptionsPath:
          HOSPITAL_ISSUER_ROUTER_PATH + HOSPITAL_ISSUER_PRESCRIPTIONS_PATH,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get(
    `${HOSPITAL_ISSUER_PRESCRIPTIONS_PATH}/:id/offer`,
    async (req, res, next) => {
      try {
        await getMedicationRequest(req.params.id);
        next();
      } catch (error) {
        agent.config.logger.error(
          `MedicationRequest with id ${req.params.id} does not exist. Error: ${error}`,
        );
        res.status(404).send();
      }
    },
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

        let data = null;
        try {
          data = await QRCode.toDataURL(offer);
        } catch (err) {
          agent.config.logger.error(
            `Unable to convert offer to QRCode. Cause: ${err}`,
          );
        }

        res.render("hospital/issuer/hospitalIssuerPrescriptionOffer", {
          offer: offer,
          data: data,
          hospitalIssuePrescriptionsPath:
            HOSPITAL_ISSUER_ROUTER_PATH + HOSPITAL_ISSUER_PRESCRIPTIONS_PATH,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
