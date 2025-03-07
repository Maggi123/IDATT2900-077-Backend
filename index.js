import express from "express";
import { initializeAgent } from "./agent.js";
import "dotenv/config";
import * as randomstring from "randomstring";
import * as readline from "node:readline";
import * as fs from "fs";
import { TypedArrayEncoder } from "@credo-ts/core";

const app = express();
const port = 3000;

const agent = await initializeAgent();
let did;

if (!agent) {
  console.log("No agent available");
  process.exit(1);
}

if ((await agent.dids.getCreatedDids()) < 1) {
  const backendDid = await agent.dids.create({
    method: "indy",
    options: {
      endorserDid: "did:indy:local:V4SGRU86Z58d6TV7PBUe6f",
      endorserMode: "external",
    },
  });

  const nymRequest = JSON.parse(backendDid.didState.nymRequest);

  console.log(
    `Initializing backend for the first time.\nPlease add the following DID to the ledger: ${backendDid.didState.did}\nThis is the verkey of this DID: ${nymRequest.operation.verkey}`,
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await new Promise((resolve) =>
    rl.question("Press enter to continue.", () => {
      rl.close();
      resolve();
    }),
  );

  await agent.dids.import({
    did: backendDid.didState.did,
  });

  did = backendDid.didState.did;
  fs.writeFile("did.txt", did, (err) => {
    if (err) console.error(err);
  });
} else {
  await fs.readFile("did.txt", (err, data) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    did = data.toString();
  });
}

app.get("/did", async (req, res) => {
  const seed = TypedArrayEncoder.fromString(
    randomstring.generate({
      length: 32,
      charset: "alphabetic",
    }),
  );

  console.log(did);

  res.send(
    await agent.dids.create({
      method: "indy",
      options: {
        endorserDid: did,
        endorserMode: "internal",
      },
      secret: {
        seed: seed,
      },
    }),
  );
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
