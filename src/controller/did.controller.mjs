import express from "express";
import * as randomstring from "randomstring";
import { TypedArrayEncoder } from "@credo-ts/core";

export const DID_ROUTER_PATH = "/did";

export function setupDidRouter(agent, endorserDid) {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    try {
      const seedString = randomstring.generate({
        length: 32,
        charset: "alphabetic",
      });
      const seed = TypedArrayEncoder.fromString(seedString);

      const didCreationResult = await agent.dids.create({
        method: "indy",
        options: {
          endorserDid,
          endorserMode: "internal",
        },
        secret: {
          seed: seed,
        },
      });

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
