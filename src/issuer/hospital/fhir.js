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

export async function getMedicationRequest(id) {
  return await fhirClient.request(`MedicationRequest/${id}`);
}

export async function getAllMedicationRequests() {
  return await fhirClient.request("MedicationRequest");
}

export function checkSmartSession(req, res, next) {
  try {
    const state = fhirClient.getState();
    if (state.expiresAt < Math.floor(new Date().getTime() / 1000))
      res.redirect(`/session_expired`);
    else next();
  } catch (err) {
    console.log(
      `Unable to communicate with SMART server, redirecting to portal. Cause: ${err}`,
    );
    res.redirect(`/`);
  }
}
