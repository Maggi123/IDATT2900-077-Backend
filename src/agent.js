import {
  Agent,
  ClaimFormat,
  ConsoleLogger,
  DidsModule,
  JwaSignatureAlgorithm,
  LogLevel,
  W3cCredential,
} from "@credo-ts/core";
import { agentDependencies } from "@credo-ts/node";
import {
  IndyVdrIndyDidRegistrar,
  IndyVdrIndyDidResolver,
  IndyVdrModule,
} from "@credo-ts/indy-vdr";
import { indyVdr } from "@hyperledger/indy-vdr-nodejs";
import { AskarModule } from "@credo-ts/askar";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import axios from "axios";
import {
  OpenId4VcIssuerModule,
  OpenId4VciCredentialFormatProfile,
  OpenId4VcIssuerEvents,
} from "@credo-ts/openid4vc";
import { getBackendIp, getBackendPort } from "./util/networkUtil.js";
import readline from "node:readline";
import fs from "fs";
import { getMedicationRequest } from "./fhir.js";

const supportedCredentials = [
  {
    format: OpenId4VciCredentialFormatProfile.JwtVcJson,
    vct: "Prescription",
    id: "Prescription",
    cryptographic_binding_methods_supported: ["did:indy"],
    cryptographic_suites_supported: [JwaSignatureAlgorithm.EdDSA],
    types: [OpenId4VciCredentialFormatProfile.JwtVcJson],
  },
];

export async function createIssuer(agent, issuerId) {
  let issuerRecord;

  try {
    issuerRecord =
      await agent.modules.openid4VcIssuer.getIssuerByIssuerId(issuerId);
  } catch (e) {
    console.error(e);
    console.log("No issuer record stored, creating new issuer.");
  }

  if (issuerRecord) {
    await agent.modules.openid4VcIssuer.updateIssuerMetadata({
      issuerId: issuerId,
      credentialsSupported: supportedCredentials,
    });
    return;
  }

  await agent.modules.openid4VcIssuer.createIssuer({
    issuerId: issuerId,
    display: [
      {
        name: "Hospital",
        description: "A hospital",
        text_color: "#ABCDEF",
        background_color: "#FFFF00",
      },
    ],
    credentialsSupported: supportedCredentials,
  });
}

export async function setDid(agent) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let did;

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
      console.error(
        "Unable to open file containing backends DID. Cause: ",
        err,
      );
      console.error(
        "Please delete backends wallet. It can normally be found under ~/.afj/data/wallet/backend",
      );
      process.exit(1);
    }
    console.log(did);
  }

  return did;
}

const credentialRequestToCredentialMapperFunction = async ({
  credentialOffer,
  credentialsSupported,
  holderBinding,
}) => {
  if (credentialsSupported.length > 0) {
    throw new Error("Only one credential is supported.");
  }

  const credentialType = credentialsSupported[0];

  if (credentialType.vct !== "Prescription") {
    throw new Error("Only Prescription is supported.");
  }

  if (credentialType.format !== OpenId4VciCredentialFormatProfile.JwtVcJson) {
    throw new Error(
      `Only ${OpenId4VciCredentialFormatProfile.JwtVcJson} format is supported.`,
    );
  }

  return {
    credentialSupportedId: credentialType.id,
    format: ClaimFormat.JwtVc,
    verificationMethod: "verkey",
    credential: new W3cCredential({
      type: ["VerifiableCredential", "Prescription"],
      issuer: {
        id: credentialOffer.issuerId,
      },
      issuanceDate: new Date(Date.now()).toISOString(),
      credentialSubject: {
        id: holderBinding,
        claims: getMedicationRequest(),
      },
    }),
  };
};

export async function initializeAgent() {
  const transactionsRq = await axios.get(
    "http://" + process.env.BACKEND_INDY_NETWORK_IP + ":9000/genesis",
  );
  if (transactionsRq.status !== 200) {
    throw new Error("Unable to connect to Indy network.");
  }

  const transactions = transactionsRq.data;

  const agent = new Agent({
    config: {
      label: "backend-wallet",
      walletConfig: {
        id: "backend",
        key: process.env.BACKEND_WALLET_KEY,
      },
      logger: new ConsoleLogger(LogLevel.test),
    },
    dependencies: agentDependencies,
    modules: {
      indyVdr: new IndyVdrModule({
        indyVdr,
        networks: [
          {
            isProduction: false,
            indyNamespace: "local",
            genesisTransactions: transactions,
            connectOnStartup: true,
          },
        ],
      }),
      askar: new AskarModule({
        ariesAskar,
      }),
      dids: new DidsModule({
        resolvers: [new IndyVdrIndyDidResolver()],
        registrars: [new IndyVdrIndyDidRegistrar()],
      }),
      openid4VcIssuer: new OpenId4VcIssuerModule({
        baseUrl: `http://${getBackendIp()}:${getBackendPort()}/oid4vci`,
        endpoints: {
          credential: {
            credentialRequestToCredentialMapper:
              credentialRequestToCredentialMapperFunction,
          },
        },
      }),
    },
  });

  await agent.initialize();

  return agent;
}

export async function createPrescriptionOffer(agent, issuerId) {
  const { credentialOffer, issuanceSession } =
    await agent.modules.openid4VcIssuer.createCredentialOffer({
      issuerId: issuerId,
      offeredCredentials: ["Prescription"],
      preAuthorizedCodeFlowConfig: {
        userPinRequired: false,
      },
    });

  agent.events.on(
    OpenId4VcIssuerEvents.IssuanceSessionStateChanged,
    (event) => {
      if (event.payload.issuanceSession.id === issuanceSession.id) {
        console.log(
          "Issuance session state changed to ",
          event.payload.issuanceSession.state,
        );
      }
    },
  );

  return credentialOffer;
}
