import express from "express";
import session from "express-session";
import {
  createIssuer,
  setDid,
  initializeAgent,
  OID4VCI_ROUTER_PATH,
} from "./agent/agent.js";
import "dotenv/config";
import * as randomstring from "randomstring";
import { LogLevel, TypedArrayEncoder } from "@credo-ts/core";
import { parseIndyDid } from "@credo-ts/anoncreds";
import {
  setupSmartRouter,
  SMART_ROUTER_PATH,
} from "./agent/issuer/hospital/smart.js";
import {
  HOSPITAL_ROUTER_PATH,
  setupHospitalIssuerRouter,
} from "./agent/issuer/hospital/hospital.js";
import { MyLogger } from "./util/logger.js";

export async function setupApp() {
  const app = express();

  app.use(express.static("public"));
  app.set("query parser", "extended");

  const logger = new MyLogger(LogLevel.test);

  let agent;
  try {
    agent = await initializeAgent(logger);
  } catch (error) {
    logger.error(
      "Something went wrong while initializing agent. Cause: ",
      error,
    );
  }

  if (!agent) {
    logger.fatal("No agent available");
    process.exit(1);
  }

  const did = await setDid(agent);
  const sovDid = `did:sov:${parseIndyDid(did).namespaceIdentifier}`;
  try {
    await agent.dids.resolveDidDocument(sovDid);
  } catch (error) {
    logger.error(
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
  app.use(OID4VCI_ROUTER_PATH, agent.modules.openid4VcIssuer.config.router);

  const smartRouter = setupSmartRouter();
  app.use(SMART_ROUTER_PATH, smartRouter);

  const hospitalRouter = setupHospitalIssuerRouter(agent, sovDid);
  app.use(HOSPITAL_ROUTER_PATH, hospitalRouter);

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
    res.render("index", {
      smartLaunchPath: `${SMART_ROUTER_PATH}/launch`,
    });
  });

  return [app, logger];
}
