import express from "express";
import { createPrescriptionVerificationRequest } from "#src/service/hospital.verifier.service.mjs";
import QRCode from "qrcode";

export const HOSPITAL_VERIFIER_ROUTER_PATH = "/verifier/hospital";
export const HOSPITAL_VERIFIER_PRESCRIPTIONS_PATH = "/prescriptions";

export function setupHospitalVerifierRouter(agent, verifierDid) {
  const router = express.Router();

  router.get("/", (req, res) => {
    res.render("hospital/verifier/hospitalVerifier", {
      hospitalVerifyPrescriptionPath:
        HOSPITAL_VERIFIER_ROUTER_PATH + HOSPITAL_VERIFIER_PRESCRIPTIONS_PATH,
    });
  });

  router.get(HOSPITAL_VERIFIER_PRESCRIPTIONS_PATH, async (req, res, next) => {
    try {
      const request = await createPrescriptionVerificationRequest(
        agent,
        verifierDid,
      );

      let data = null;
      try {
        data = await QRCode.toDataURL(request);
      } catch (err) {
        agent.config.logger.error(
          `Unable to convert request to QRCode. Cause: ${err}`,
        );
      }

      res.render("hospital/verifier/hospitalVerifierPrescription", {
        request: request,
        data: data,
        hospitalVerifierPath: HOSPITAL_VERIFIER_ROUTER_PATH,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
