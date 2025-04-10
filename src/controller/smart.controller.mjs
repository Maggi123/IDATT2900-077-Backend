import express from "express";
import smart from "fhirclient";

import { setFhirClient } from "#src/service/smart.service.mjs";
import { HOSPITAL_ISSUER_ROUTER_PATH } from "#src/controller/hospital.issuer.controller.mjs";

export const SMART_ROUTER_PATH = "/smart";

export function setupSmartRouter() {
  const router = express.Router();

  const smartSettings = {
    clientId: "my-client-id",
    redirectUri: `${SMART_ROUTER_PATH}/redirect`,
    scope: "launch/patient patient/*.read openid fhirUser",
    iss: process.env.SMART_URL,
  };

  router.get("/launch", (req, res, next) => {
    smart(req, res).authorize(smartSettings).catch(next);
  });

  router.get("/redirect", async (req, res) => {
    setFhirClient(await smart(req, res).ready());
    res.redirect(HOSPITAL_ISSUER_ROUTER_PATH);
  });

  router.get("/session_expired", (req, res) => {
    res.render("hospital/issuer/sessionExpired");
  });

  return router;
}
