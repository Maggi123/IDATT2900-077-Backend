import express from "express";
import { createDid } from "#src/service/did.service.mjs";

export const DID_ROUTER_PATH = "/did";

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
