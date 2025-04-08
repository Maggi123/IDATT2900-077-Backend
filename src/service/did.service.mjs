import * as randomstring from "randomstring";
import { TypedArrayEncoder } from "@credo-ts/core";

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
