import express from "express";
import { initializeAgent } from "./agent.js";
import "dotenv/config";
import * as randomstring from "randomstring";
import * as readline from "node:readline";
import * as fs from "fs";
import { TypedArrayEncoder } from "@credo-ts/core";

const app = express();
const port = 3000;

let agent;
try {
  agent = await initializeAgent();
} catch (error) {
  console.error(
    "Something went wrong while initializing agent. Cause: ",
    error,
  );
}
let did;

if (!agent) {
  console.log("No agent available");
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

if ((await agent.dids.getCreatedDids({ method: "indy" })) < 1) {
  let endorserNym;

  console.log(
    `Initializing backend for the first time.
    Please open the ledgers web interface here: http://${process.env.BACKEND_INDY_NETWORK_IP}:9000/browse/domain`,
  );

  await new Promise((resolve) => {
    rl.question(
      "Please enter the NYM value of a transaction with the TRUSTEE role here: ",
      (answer) => {
        endorserNym = answer;
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
  const didLastColonIndex = backendDid.didState.did.lastIndexOf(":");
  const didShort = backendDid.didState.did.substring(didLastColonIndex + 1);

  console.log(
    `Please open the ledgers web interface here: http://${process.env.BACKEND_INDY_NETWORK_IP}:9000
    To add a DID to the ledger, choose the "Register from DID" radio button under the "Authenticate a New DID" section.
    Fill out the mandatory fields with the values given below.\n
    Add the following DID to the ledger: ${didShort}\n
    This is the verkey of this DID: ${nymRequest.operation.verkey}`,
  );

  await new Promise((resolve) =>
    rl.question(
      "After you are done following the instructions above, press enter to continue.",
      () => {
        rl.close();
        resolve();
      },
    ),
  );

  await agent.dids.import({
    did: backendDid.didState.did,
  });

  if (backendDid.didState.state === "failed") {
    console.error(
      `Unable to create an endorser DID for backend. Cause: ${backendDid.didState.reason}`,
    );
    process.exit(1);
  }

  did = backendDid.didState.did;
  fs.writeFile("did.txt", did, (err) => {
    if (err) console.error(err);
  });
} else {
  try {
    did = fs.readFileSync("did.txt").toString();
  } catch (err) {
    console.error("Unable to open file containing backends DID. Cause: ", err);
    console.error(
      "Please delete backends wallet. It can normally be found under ~/.afj/data/wallet/backend",
    );
    process.exit(1);
  }
  console.log(did);
}

app.get("/did", async (req, res) => {
  const seedString = randomstring.generate({
    length: 32,
    charset: "alphabetic",
  });
  const seed = TypedArrayEncoder.fromString(seedString);

  const didCreationResult = await agent.dids.create({
    method: "indy",
    options: {
      endorserDid: did,
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
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
