import smart from "fhirclient";
import express from "express";
import { HOSPITAL_ROUTER_PATH } from "./hospital.js";

export const SMART_ROUTER_PATH = "/smart";
let fhirClient;

export function setupSmartRouter() {
  const fhirRouter = express.Router();

  const smartSettings = {
    clientId: "my-client-id",
    redirectUri: `${SMART_ROUTER_PATH}/redirect`,
    scope: "launch/patient patient/*.read openid fhirUser",
    iss: process.env.SMART_URL,
  };

  fhirRouter.get("/launch", (req, res, next) => {
    smart(req, res).authorize(smartSettings).catch(next);
  });

  fhirRouter.get("/redirect", async (req, res) => {
    fhirClient = await smart(req, res).ready();
    res.redirect(HOSPITAL_ROUTER_PATH);
  });

  return fhirRouter;
}

export async function getMedicationRequest(id) {
  return await fhirClient.request(`MedicationRequest/${id}`);
}

export async function getAllMedicationRequests() {
  return await fhirClient.request("MedicationRequest");
}

export function getCheckSmartSessionMiddleware(agent) {
  return function (req, res, next) {
    try {
      const state = fhirClient.getState();
      if (state.expiresAt < Math.floor(new Date().getTime() / 1000))
        res.redirect(`${HOSPITAL_ROUTER_PATH}/session_expired`);
      else next();
    } catch (err) {
      agent.config.logger.info(
        `Unable to communicate with SMART server, redirecting to portal. Cause: ${err}`,
      );
      res.redirect(`/`);
    }
  };
}
