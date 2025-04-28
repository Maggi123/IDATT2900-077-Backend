import express from "express";

import { createDid } from "#src/service/did.service.mjs";

/** @module controller/did */

export const DID_ROUTER_PATH = "/did";

/**
 * Set up the router for the DID controller.
 *
 * @param agent the agent used for DID creation and logging.
 * @param endorserDid the DID used for endorsing the DID creation transaction.
 * @returns {Express.Router} the router for the DID controller.
 */
export function setupDidRouter(agent, endorserDid) {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    try {
      const [didCreationResult, seedString] = await createDid(
        agent,
        endorserDid,
      );

      if (didCreationResult.didState.state === "failed") {
        res.status(500).send(didCreationResult.didState.reason);
      } else {
        res.send({
          didUrl: didCreationResult.didState.did,
          seed: seedString,
        });
      }
    } catch (error) {
      next(error);
    }
  });

  return router;
}
