import express from "express";
import QRCode from "qrcode";
import { parseDid } from "@credo-ts/core";

import { createPrescriptionOffer } from "#src/service/hospital.issuer.service.mjs";
import {
  getCheckSmartSessionMiddleware,
  getAllMedicationRequests,
  getMedicationRequest,
} from "#src/service/smart.service.mjs";

/** @module constroller/hospital-issuer */

export const HOSPITAL_ISSUER_ROUTER_PATH = "/issuer/hospital";
export const HOSPITAL_ISSUER_PRESCRIPTIONS_PATH = `/prescriptions`;

/**
 * Set up the router for the hospital issuer.
 *
 * @param agent the agent used for issuing the prescriptions and logging.
 * @param issuerDid the DID of the issuer.
 * @returns {Express.Router} the router for the hospital issuer.
 */
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
    // Checks that the MedicationRequest with the given id exists.
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
    // Checks that the recipient DID is valid.
    async (req, res, next) => {
      try {
        parseDid(req.query.recipient);
        next();
      } catch (error) {
        agent.config.logger.error(
          `Invalid DID in query parameter recipient. Error: ${error}`,
        );
        res.render("hospital/issuer/invalidDid");
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
          req.query.recipient,
        );

        agent.config.logger.info("Recipient DID: " + req.query.recipient);

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
