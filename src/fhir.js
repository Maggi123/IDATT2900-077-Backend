import smart from "fhirclient";
import express from "express";
let fhirClient;

export function setupFhirRouter() {
  const fhirRouter = express.Router();

  const smartSettings = {
    clientId: "my-client-id",
    redirectUri: "/fhir/redirect",
    scope: "launch/patient patient/*.read openid fhirUser",
    iss: process.env.SMART_URL,
  };

  fhirRouter.get("/launch", (req, res, next) => {
    smart(req, res).authorize(smartSettings).catch(next);
  });

  fhirRouter.get("/redirect", async (req, res) => {
    fhirClient = await smart(req, res).ready();
    res.redirect(`/hospital`);
  });

  return fhirRouter;
}

export async function getMedicationRequest() {
  return await fhirClient.request("MedicationRequest/100");
}
