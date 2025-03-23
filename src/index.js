import express from "express";
import session from "express-session";
import {
  createIssuer,
  setDid,
  initializeAgent,
  createPrescriptionOffer,
} from "./agent.js";
import "dotenv/config";
import * as randomstring from "randomstring";
import { TypedArrayEncoder } from "@credo-ts/core";
import { getBackendPort } from "./util/networkUtil.js";
import { setupFhirRouter } from "./fhir.js";

const app = express();
const port = getBackendPort();

let agent;
try {
  agent = await initializeAgent();
} catch (error) {
  console.error(
    "Something went wrong while initializing agent. Cause: ",
    error,
  );
}

if (!agent) {
  console.log("No agent available");
  process.exit(1);
}

const did = await setDid(agent);

app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
  }),
);
app.set("view engine", "pug");

await createIssuer(agent, did);
app.use("/oid4vci", agent.modules.openid4VcIssuer.config.router);

const fhirRouter = setupFhirRouter();
app.use("/fhir", fhirRouter);

app.get("/did", async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
});

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/hospital", (req, res) => {
  res.render("hospital");
});

app.get("/hospitalPrescriptionOffer", async (req, res, next) => {
  try {
    const offer = await createPrescriptionOffer(agent, did);

    res.render("hospitalPrescriptionOffer", {
      offer: offer,
    });
  } catch (error) {
    next(error);
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
