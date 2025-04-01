import express from "express";
import session from "express-session";
import { createIssuer, setDid, initializeAgent } from "./agent.js";
import "dotenv/config";
import * as randomstring from "randomstring";
import { TypedArrayEncoder } from "@credo-ts/core";
import { parseIndyDid } from "@credo-ts/anoncreds";
import { getBackendPort } from "./util/networkUtil.js";
import { setupFhirRouter } from "./issuer/hospital/fhir.js";
import { setupHospitalIssuerRouter } from "./issuer/hospital/hospital.js";

const app = express();
const port = getBackendPort();

app.use(express.static("public"));

let agent;
try {
  agent = await initializeAgent();
} catch (error) {
  agent.config.logger.error(
    "Something went wrong while initializing agent. Cause: ",
    error,
  );
}

if (!agent) {
  agent.config.logger.fatal("No agent available");
  process.exit(1);
}

const did = await setDid(agent);
const sovDid = `did:sov:${parseIndyDid(did).namespaceIdentifier}`;
try {
  await agent.dids.resolveDidDocument(sovDid);
} catch (error) {
  agent.config.logger.error(
    `Could not resolve legacy DID, unable to sign credentials. Cause: ${error}`,
  );
}

app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
  }),
);
app.set("view engine", "pug");

await createIssuer(agent, sovDid);
app.use("/oid4vci", agent.modules.openid4VcIssuer.config.router);

const fhirRouter = setupFhirRouter();
app.use("/fhir", fhirRouter);

const hospitalRouter = setupHospitalIssuerRouter(agent, sovDid);
app.use("/hospital", hospitalRouter);

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

app.get("/session_expired", (req, res) => {
  res.render("sessionExpired");
});

app.get("/", (req, res) => {
  res.render("index");
});

app.listen(port, () => {
  agent.config.logger.info(`Server listening on port ${port}`);
});
