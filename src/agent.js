import {
  Agent,
  ClaimFormat,
  DidsModule,
  JwaSignatureAlgorithm,
  LogLevel,
  parseDid,
  W3cCredential,
  W3cCredentialSubject,
  w3cDate,
  W3cIssuer,
} from "@credo-ts/core";
import { agentDependencies } from "@credo-ts/node";
import {
  IndyVdrIndyDidRegistrar,
  IndyVdrIndyDidResolver,
  IndyVdrModule,
  IndyVdrSovDidResolver,
} from "@credo-ts/indy-vdr";
import { indyVdr } from "@hyperledger/indy-vdr-nodejs";
import { AskarModule } from "@credo-ts/askar";
import { askar } from "@openwallet-foundation/askar-nodejs";
import axios from "axios";
import {
  OpenId4VcIssuerModule,
  OpenId4VciCredentialFormatProfile,
  OpenId4VcIssuerEvents,
  OpenId4VcIssuanceSessionState,
} from "@credo-ts/openid4vc";
import { getBackendIp, getBackendPort } from "./util/networkUtil.js";
import readline from "node:readline";
import fs from "fs";
import { MyLogger } from "./logger.js";
import { getPrescriptionClaims } from "./issuer/hospital/hospital.js";

const supportedCredentials = {
  Prescription: {
    format: OpenId4VciCredentialFormatProfile.JwtVcJson,
    vct: "Prescription",
    scope: "openid4vc:credential:Prescription",
    cryptographic_binding_methods_supported: ["did:indy"],
    cryptographic_suites_supported: [JwaSignatureAlgorithm.EdDSA],
    types: [OpenId4VciCredentialFormatProfile.JwtVcJson],
    credential_definition: {
      type: ["VerifiableCredential", "Prescription"],
      issuer: {
        id: "",
      },
      credentialSubject: {
        id: {},
        claims: {
          name: "",
          authoredOn: "",
          activeIngredient: "",
        },
      },
    },
  },
};

const display = [
  {
    name: "Hospital",
    description: "A hospital",
    text_color: "#ABCDEF",
    background_color: "#FFFF00",
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
      display: display,
      credentialConfigurationsSupported: supportedCredentials,
    });
    console.log("Updated issuer metadata");
    return;
  }

  await agent.modules.openid4VcIssuer.createIssuer({
    issuerId: issuerId,
    display: display,
    credentialConfigurationsSupported: supportedCredentials,
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
  issuanceSession,
  holderBindings,
  credentialConfigurationIds,
  credentialConfigurationsSupported: supported,
}) => {
  const credentialConfigurationId = credentialConfigurationIds[0];
  const credentialConfiguration = supported[credentialConfigurationId];
  const prescriptionClaims = await getPrescriptionClaims(
    issuanceSession.issuanceMetadata.prescriptionId,
  );

  if (
    credentialConfiguration.format ===
    OpenId4VciCredentialFormatProfile.JwtVcJson
  ) {
    return {
      credentialConfigurationId,
      format: ClaimFormat.JwtVc,
      credentials: holderBindings.map((holderBinding) => {
        if (!holderBinding.didUrl)
          throw new Error("Did not receive only DID holder bindings.");
        return {
          credential: new W3cCredential({
            type: credentialConfiguration.credential_definition.type,
            issuer: new W3cIssuer({
              id: issuanceSession.issuerId,
            }),
            credentialSubject: new W3cCredentialSubject({
              id: parseDid(holderBinding.didUrl).did,
              claims: prescriptionClaims,
            }),
            issuanceDate: w3cDate(Date.now()),
          }),
          verificationMethod: `${issuanceSession.issuerId}#key-1`,
        };
      }),
    };
  }

  throw new Error("Invalid credential request.");
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
      logger: new MyLogger(LogLevel.test),
      allowInsecureHttpUrls: true,
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
        askar,
      }),
      dids: new DidsModule({
        resolvers: [new IndyVdrIndyDidResolver(), new IndyVdrSovDidResolver()],
        registrars: [new IndyVdrIndyDidRegistrar()],
      }),
      openid4VcIssuer: new OpenId4VcIssuerModule({
        baseUrl: `http://${getBackendIp()}:${getBackendPort()}/oid4vci`,
        credentialRequestToCredentialMapper:
          credentialRequestToCredentialMapperFunction,
      }),
    },
  });

  await agent.initialize();

  return agent;
}

export async function createPrescriptionOffer(agent, issuerId, prescriptionId) {
  const { credentialOffer, issuanceSession } =
    await agent.modules.openid4VcIssuer.createCredentialOffer({
      issuerId: issuerId,
      offeredCredentials: ["Prescription"],
      preAuthorizedCodeFlowConfig: {
        userPinRequired: false,
      },
      issuanceMetadata: {
        prescriptionId: prescriptionId,
      },
    });

  agent.events.on(
    OpenId4VcIssuerEvents.IssuanceSessionStateChanged,
    function handler(event) {
      if (event.payload.issuanceSession.id === issuanceSession.id) {
        console.log(
          "Issuance session state changed to ",
          event.payload.issuanceSession.state,
        );
        if (
          event.payload.issuanceSession.state ===
          OpenId4VcIssuanceSessionState.Completed
        ) {
          agent.config.logger.info(
            `Removing listener from issuanceSession with id: ${event.payload.issuanceSession.id}`,
          );
          agent.events.off(
            OpenId4VcIssuerEvents.IssuanceSessionStateChanged,
            handler,
          );
        }
      }
    },
  );

  return credentialOffer;
}
