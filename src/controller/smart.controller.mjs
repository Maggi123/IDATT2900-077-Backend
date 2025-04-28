import express from "express";
import smart from "fhirclient";

import { setFhirClient } from "#src/service/smart.service.mjs";
import { HOSPITAL_ISSUER_ROUTER_PATH } from "#src/controller/hospital.issuer.controller.mjs";

/** @module controller/smart */

export const SMART_ROUTER_PATH = "/smart";

/**
 * Set up the router for the SMART launch flow.
 *
 * @returns {Express.Router} the router for the SMART launch flow.
 * @see https://docs.smarthealthit.org/
 */
export function setupSmartRouter() {
  const router = express.Router();

  // SMART launch configuration.
  const smartSettings = {
    clientId: "my-client-id",
    redirectUri: `${SMART_ROUTER_PATH}/redirect`,
    scope: "launch/patient patient/*.read openid fhirUser",
    iss: process.env.SMART_URL,
  };

  // Endpoint for starting the SMART launch flow.
  // Redirects to the SMART server for authorization.
  router.get("/launch", (req, res, next) => {
    smart(req, res).authorize(smartSettings).catch(next);
  });

  // Endpoint for handling the SMART authorization response.
  router.get("/redirect", async (req, res) => {
    setFhirClient(await smart(req, res).ready());
    res.redirect(HOSPITAL_ISSUER_ROUTER_PATH);
  });

  router.get("/session_expired", (req, res) => {
    res.render("hospital/issuer/sessionExpired");
  });

  return router;
}
