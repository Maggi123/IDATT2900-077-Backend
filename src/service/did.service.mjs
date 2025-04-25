import * as randomstring from "randomstring";
import { TypedArrayEncoder } from "@credo-ts/core";

/**
 * Creates a new DID.
 * The agent used is used as the endorser for the DID creation.
 *
 * @param agent the agent to use for the DID creation.
 * @param endorserDid the DID used to endorse the DID creation.
 * @returns {Promise<[DidCreateResult<DidOperationStateActionBase>, Buffer]>} the result of the DID creation and the seed used for the DID.
 */
export async function createDid(agent, endorserDid) {
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

  return [didCreationResult, seed];
}
