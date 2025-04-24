import express from "express";
import {
  createPrescriptionVerificationRequest,
  getPrescriptionVerificationSessionStateChangeHandler,
} from "#src/service/hospital.verifier.service.mjs";
import QRCode from "qrcode";
import { OpenId4VcVerifierEvents } from "@credo-ts/openid4vc";

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
      const [request, id] = await createPrescriptionVerificationRequest(
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
        verificationSessionEventEndpoint: `${HOSPITAL_VERIFIER_ROUTER_PATH}/verificationEvents/${id}`,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get(
    "/verificationEvents/:id",
    async (req, res, next) => {
      try {
        await agent.modules.openid4VcVerifier.getVerificationSessionById(
          req.params.id,
        );
        next();
      } catch (err) {
        agent.config.logger.error(
          `Verification session with id ${req.params.id} not found: ${err}`,
        );
        res.status(404).send();
      }
    },
    async (req, res) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Connection", "keep-alive");

      res.write(
        `data: Connected to event stream for verification session with id ${req.params.id}\n\n`,
      );

      const handlerFunction =
        await getPrescriptionVerificationSessionStateChangeHandler(
          agent,
          req.params.id,
          res,
        );

      agent.events.on(
        OpenId4VcVerifierEvents.VerificationSessionStateChanged,
        handlerFunction,
      );

      req.on("close", () => {
        agent.config.logger.debug(
          `Verification session ${req.params.id} event stream closed.`,
        );
        agent.events.off(
          OpenId4VcVerifierEvents.VerificationSessionStateChanged,
          handlerFunction,
        );
        res.end();
      });
    },
  );

  return router;
}
