import express from "express";
import session from "express-session";
import helmet from "helmet";
import crypto from "crypto";
import "dotenv/config";
import { LogLevel } from "@credo-ts/core";
import { parseIndyDid } from "@credo-ts/anoncreds";

import { MyLogger } from "./util/logger.mjs";
import {
  setupIssuer,
  setDid,
  initializeAgent,
  OID4VCI_ROUTER_PATH,
  setupVerifier,
  OID4VP_ROUTER_PATH,
} from "./service/agent.service.mjs";
import {
  HOSPITAL_ISSUER_ROUTER_PATH,
  setupHospitalIssuerRouter,
} from "./controller/hospital.issuer.controller.mjs";
import {
  setupSmartRouter,
  SMART_ROUTER_PATH,
} from "./controller/smart.controller.mjs";
import {
  DID_ROUTER_PATH,
  setupDidRouter,
} from "./controller/did.controller.mjs";
import {
  HOSPITAL_VERIFIER_ROUTER_PATH,
  setupHospitalVerifierRouter,
} from "#src/controller/hospital.verifier.controller.mjs";
import { hospitalDisplay } from "#src/service/hospital.issuer.service.mjs";

/** @module app */

/**
 * Sets up the server application.
 *
 * - Sets up a logger
 * - Initializes an agent
 * - Sets DIDs used for OID4VCI and OID4VP services
 * - Registers controllers on an express application
 * - Registers root server route
 *
 * Exits the process early if the agent initialization fails.
 *
 * @returns {Promise<(Array<Express, MyLogger>)>} array of express application and logger
 */
export async function setupApp() {
  const app = express();

  app.use(express.static("public"));
  app.set("query parser", "extended");

  // Generate CSP nonce for every request
  app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(32).toString("hex");
    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          scriptSrc: [
            (req, res) => `'nonce-${res.locals.cspNonce}'`,
            "'unsafe-inline'",
          ],
          styleSrc: ["'self'"],
          requireTrustedTypesFor: ["'script'"],
        },
      },
    }),
  );

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
    return process.exit(1);
  }

  // Sets the DID of the application.
  // The application sets a DID with the sov method because credo-ts currently does not implement support
  // for signing verifiable credentials or presentations with the indy method.
  // The indy DID is nevertheless used for generating DIDs in the DID controller
  const did = await setDid(agent);
  const sovDid = `did:sov:${parseIndyDid(did).namespaceIdentifier}`;
  try {
    await agent.dids.resolveDidDocument(sovDid);
  } catch (error) {
    logger.error(
      `Could not resolve sov DID, unable to sign credentials or presentations. Cause: ${error}`,
    );
  }

  app.use(
    session({
      name: process.env.SESSION_SECRET || "my secret",
      secret: "my secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: true,
      },
    }),
  );
  app.set("view engine", "pug");

  // Sets up a hospital OID4VCI issuer
  await setupIssuer(agent, sovDid, hospitalDisplay);
  app.use(OID4VCI_ROUTER_PATH, agent.modules.openid4VcIssuer.config.router);

  // Sets up a hospital OID4VP verifier
  await setupVerifier(agent, sovDid);
  app.use(OID4VP_ROUTER_PATH, agent.modules.openid4VcVerifier.config.router);

  // Registers routes for interacting with a SMART server
  const smartRouter = setupSmartRouter();
  app.use(SMART_ROUTER_PATH, smartRouter);

  // Registers hospital issuer webpages
  const hospitalIssuerRouter = setupHospitalIssuerRouter(agent, sovDid);
  app.use(HOSPITAL_ISSUER_ROUTER_PATH, hospitalIssuerRouter);

  // Registers hospital verifier webpages
  const hospitalVerifierRouter = setupHospitalVerifierRouter(agent, sovDid);
  app.use(HOSPITAL_VERIFIER_ROUTER_PATH, hospitalVerifierRouter);

  // Registers DID creation endpoint
  const didRouter = setupDidRouter(agent, did);
  app.use(DID_ROUTER_PATH, didRouter);

  // Registers portal webpage on root route
  app.get("/", (req, res) => {
    res.render("index", {
      smartLaunchPath: `${SMART_ROUTER_PATH}/launch`,
      hospitalVerifierPath: `${HOSPITAL_VERIFIER_ROUTER_PATH}`,
    });
  });

  return [app, logger];
}
