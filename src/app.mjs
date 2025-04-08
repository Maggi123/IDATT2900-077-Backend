import express from "express";
import session from "express-session";
import "dotenv/config";
import { LogLevel } from "@credo-ts/core";
import { parseIndyDid } from "@credo-ts/anoncreds";

import { MyLogger } from "./util/logger.mjs";
import {
  createIssuer,
  setDid,
  initializeAgent,
  OID4VCI_ROUTER_PATH,
} from "./service/agent.service.mjs";
import {
  HOSPITAL_ROUTER_PATH,
  setupHospitalIssuerRouter,
} from "./controller/hospital.controller.mjs";
import {
  setupSmartRouter,
  SMART_ROUTER_PATH,
} from "./controller/smart.controller.mjs";
import {
  DID_ROUTER_PATH,
  setupDidRouter,
} from "./controller/did.controller.mjs";

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

  const didRouter = setupDidRouter(agent, did);
  app.use(DID_ROUTER_PATH, didRouter);

  app.get("/", (req, res) => {
    res.render("index", {
      smartLaunchPath: `${SMART_ROUTER_PATH}/launch`,
    });
  });

  return [app, logger];
}
