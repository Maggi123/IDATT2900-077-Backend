import { OpenId4VcIssuerApi, OpenId4VcVerifierApi } from "@credo-ts/openid4vc";
import { DidsApi, EventEmitter } from "@credo-ts/core";
import { agentDependencies } from "@credo-ts/node";
import { MyLogger } from "#src/util/logger.mjs";
import express from "express";

export function getSimpleAgentMock(logLevel) {
  return {
    modules: {
      openid4VcVerifier: new OpenId4VcVerifierApi(
        {
          router: express.Router(),
        },
        undefined,
        undefined,
      ),
      openid4VcIssuer: new OpenId4VcIssuerApi(
        {
          router: express.Router(),
        },
        undefined,
        undefined,
      ),
    },
    events: new EventEmitter(agentDependencies, null),
    dids: new DidsApi(undefined, undefined, undefined, undefined, undefined),
    config: {
      logger: new MyLogger(logLevel),
    },
  };
}
