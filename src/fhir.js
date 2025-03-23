import smart from "fhirclient";
import express from "express";
let fhirClient;

export function setupFhirRouter() {
  const fhirRouter = express.Router();

  const smartSettings = {
    clientId: "my-client-id",
    redirectUri: "/fhir/redirect",
    scope: "launch/patient patient/*.read openid fhirUser",
    iss: "http://localhost:4013/v/r4/sim/eyJoIjoiMSIsImIiOiIxIiwiaSI6IjEiLCJqIjoiMSIsImUiOiIzIn0/fhir",
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
  return await fhirClient.request("Patient/1/MedicationRequest");
}
