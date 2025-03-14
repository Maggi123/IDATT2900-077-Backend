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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

if ((await agent.dids.getCreatedDids()) < 1) {
  let endorserNym;

  await new Promise((resolve) => {
    rl.question(
      "Please enter the NYM value of a TRUSTEE node here: ",
      (answer) => {
        endorserNym = answer;
        rl.close();
        resolve();
      },
    );
  });

  const backendDid = await agent.dids.create({
    method: "indy",
    options: {
      endorserDid: "did:indy:local:" + endorserNym,
      endorserMode: "external",
    },
  });

  const nymRequest = JSON.parse(backendDid.didState.nymRequest);

  console.log(
    `Initializing backend for the first time.\nPlease add the following DID to the ledger: ${backendDid.didState.did}\nThis is the verkey of this DID: ${nymRequest.operation.verkey}`,
  );

  await new Promise((resolve) =>
    rl.question("Press enter to continue.", () => {
      rl.close();
      resolve();
    }),
  );

  await agent.dids.import({
    did: backendDid.didState.did,
  });

  if (backendDid.didState.state === "failed") {
    console.error("Unable to create an endorser DID for backend.");
    process.exit(1);
  }

  did = backendDid.didState.did;
  fs.writeFile("did.txt", did, (err) => {
    if (err) console.error(err);
  });
} else {
  did = fs.readFileSync("did.txt").toString();
  console.log(did);
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
