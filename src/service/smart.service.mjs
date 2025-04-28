import { SMART_ROUTER_PATH } from "#src/controller/smart.controller.mjs";

let fhirClient;

export function setFhirClient(client) {
  fhirClient = client;
}

/**
 * Request a MedicationRequest by id.
 *
 * @param id {string} The id of the MedicationRequest to request.
 * @returns The MedicationRequest resource.
 * @see https://www.hl7.org/fhir/medicationrequest.html
 */
export async function getMedicationRequest(id) {
  return await fhirClient.request(`MedicationRequest/${id}`);
}

export async function getAllMedicationRequests() {
  return await fhirClient.request("MedicationRequest");
}

/**
 * Constructs a middleware function that checks if the SMART session is still valid.
 * The middleware will redirect the user to the portal if the session is not valid.
 *
 * @param agent {Agent} the agent to use for logging.
 * @returns {(function(Request, Response, NextFunction): void)}
 */
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
