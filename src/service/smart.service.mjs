import { SMART_ROUTER_PATH } from "#src/controller/smart.controller.mjs";

let fhirClient;

export function setFhirClient(client) {
  fhirClient = client;
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
        res.redirect(`${SMART_ROUTER_PATH}/session_expired`);
      else next();
    } catch (err) {
      agent.config.logger.info(
        `Unable to communicate with SMART server, redirecting to portal. Cause: ${err}`,
      );
      res.redirect(`/`);
    }
  };
}
