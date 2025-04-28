import readline from "readline";
import fs from "fs";

import axios from "axios";

import {
  Agent,
  ClaimFormat,
  DidsModule,
  JwaSignatureAlgorithm,
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
import {
  OpenId4VciCredentialFormatProfile,
  OpenId4VcIssuerModule,
  OpenId4VcVerifierModule,
} from "@credo-ts/openid4vc";
import { AskarModule } from "@credo-ts/askar";
import { askar } from "@openwallet-foundation/askar-nodejs";
import { indyVdr } from "@hyperledger/indy-vdr-nodejs";

import { getBackendIp, getBackendPort } from "#src/util/networkUtil.mjs";
import { getPrescriptionClaims } from "#src/service/hospital.issuer.service.mjs";

export const OID4VCI_ROUTER_PATH = "/oid4vci";
export const OID4VP_ROUTER_PATH = "/siop";

/**
 * Converts a request for credentials from a holder to credentials ready for signing by the issuer.
 * Checks if the request specified a supported credential configuration.
 * Checks if the holder has supplied a valid binding.
 * Checks if the holder is the intended recipient.
 *
 * @param issuanceSession object representing the issuance session, which also contains credential offer metadata
 * @param holderBindings object containing the bindings supplied by the holder
 * @param credentialConfigurationIds array of credential configuration ids requested
 * @param supported object containing credential configuration definitions
 * @returns object containing the data for signing
 * @throws Error if specified credential configuration is not supported
 * @throws Error if a supplied holder binding is not a DID
 * @throws Error if a supplied holder binding is not the intended recipient
 * @throws Error if the format of specified credential configuration is not "jwt_vc_json"
 */
export async function credentialRequestToCredentialMapperFunction({
  issuanceSession,
  holderBindings,
  credentialConfigurationIds,
  credentialConfigurationsSupported: supported,
}) {
  // This function only handles the first specified credential configuration
  // This is enough for the purposes of this application, as it is only expected to handle its own offers
  const credentialConfigurationId = credentialConfigurationIds[0];
  const credentialConfiguration = supported[credentialConfigurationId];

  if (!credentialConfiguration) {
    throw new Error("Credential configuration not supported.");
  }

  const prescriptionClaims = await getPrescriptionClaims(
    issuanceSession.issuanceMetadata.prescriptionId,
  );
  const issuanceDate = new Date();
  const expirationDate = new Date();
  expirationDate.setDate(
    expirationDate.getDate() + issuanceSession.issuanceMetadata.validityDays,
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
        if (
          parseDid(holderBinding.didUrl).did !==
          parseDid(issuanceSession.issuanceMetadata.recipientDid).did
        )
          throw new Error(
            "Holder supplied bindings not matching did of intended recipient.",
          );
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
            issuanceDate: w3cDate(issuanceDate.getTime()),
            expirationDate: w3cDate(expirationDate.getTime()),
          }),
          verificationMethod: `${issuanceSession.issuerId}#key-1`,
        };
      }),
    };
  }

  throw new Error("Invalid credential request.");
}

/**
 * Fetches the genesis transactions of the configured Indy network and initializes an agent with it.
 * The function assumes the Indy network is a [VON network]{@link https://github.com/bcgov/von-network} running on prot 9000.
 *
 * The agent is also configured with:
 * - an Askar wallet
 * - support for creating and resolving DIDs with the indy method
 * - support for resolving DIDs with the sov method
 * - OID4VCI support
 * - OID4VP support
 *
 * @param logger {Logger} a logger instance used by the agent
 * @returns {Promise<Agent<{indyVdr: IndyVdrModule, askar: AskarModule, dids: DidsModule, openid4VcIssuer: OpenId4VcIssuerModule, openid4VcVerifier: OpenId4VcVerifierModule}>>} the initialized agent object
 * @throws Error if the Indy network cannot be reached
 */
export async function initializeAgent(logger) {
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
      logger,
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
        baseUrl: `http://${getBackendIp()}:${getBackendPort()}${OID4VCI_ROUTER_PATH}`,
        credentialRequestToCredentialMapper:
          credentialRequestToCredentialMapperFunction,
      }),
      openid4VcVerifier: new OpenId4VcVerifierModule({
        baseUrl: `http://${getBackendIp()}:${getBackendPort()}${OID4VP_ROUTER_PATH}`,
      }),
    },
  });

  await agent.initialize();

  return agent;
}

/**
 * Generates and stores a DID using the indy method in the agent's wallet if none exists.
 * This DID will be used with the OID4VCI and OID4VP services.
 * The process of generating the DID involves registering an endorser on the agent's Indy network.
 * The process assumes the Indy network is a [VON network]{@link https://github.com/bcgov/von-network} running on prot 9000.
 *
 * @param agent the agent to set a DID for
 * @returns {Promise<string>} the DID set for the given agent
 */
export async function setDid(agent) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let did;

  if ((await agent.dids.getCreatedDids({ method: "indy" })) < 1) {
    let endorserNym;

    agent.config.logger.info(
      `Initializing backend for the first time.
    Please open the ledgers web interface here: http://${process.env.BACKEND_INDY_NETWORK_IP}:9000/browse/domain`,
    );

    // An existing TRUSTEE transaction NYM is needed so that credo-ts can complete the DID creation process.
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

    if (backendDid.didState.state === "failed") {
      agent.config.logger.error(
        `Unable to create an endorser DID for backend. Cause: ${backendDid.didState.reason}`,
      );
      return process.exit(1);
    }

    // The DID has to be registered manually on the VON-network ledger because
    // the agent wallet does not contain the private key of the endorser.
    const nymRequest = JSON.parse(backendDid.didState.nymRequest);
    const didLastColonIndex = backendDid.didState.did.lastIndexOf(":");
    const didShort = backendDid.didState.did.substring(didLastColonIndex + 1);

    agent.config.logger.info(
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

    // If the DID is registered on the ledger, this will ensure a DIDRecord is created in the agent wallet.
    await agent.dids.import({
      did: backendDid.didState.did,
    });

    did = backendDid.didState.did;

    // Write the DID to a file so that it can be persisted across restarts.
    // This is just in case the agent contains multiple indy DIDs.
    fs.writeFile("did.txt", did, (err) => {
      if (err) agent.config.logger.error(err);
    });
  } else {
    try {
      did = fs.readFileSync("did.txt").toString();
    } catch (err) {
      // If the file does not exist, the existing wallet must be deleted to allow the agent to create a new DID.
      agent.config.logger.error(
        `Unable to open file containing backends DID. Cause: ${err}`,
      );
      agent.config.logger.error(
        "Please delete backends wallet. It can normally be found under ~/.afj/data/wallet/backend",
      );
      process.exit(1);
    }
    agent.config.logger.info(did);
  }

  return did;
}

/**
 * Defines the supported credential configurations for the backend.
 * Defined in accordance with the [OpenID for Verifiable Credential Issuance draft specification]{@link https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html}.
 */
export const supportedCredentials = {
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
        id: {},
      },
      credentialSubject: {
        id: {},
        claims: {
          name: {},
          authoredOn: {},
          activeIngredient: {},
        },
      },
    },
  },
};

/**
 * Creates an issuer record in an agent's wallet if none exists.
 * Updates the issuer record if it already exists.
 *
 * @param agent the agent to create the issuer record for
 * @param issuerId the DID of the issuer
 * @param issuerDisplay metadata about the display name of the issuer
 */
export async function setupIssuer(agent, issuerId, issuerDisplay) {
  let issuerRecord;

  try {
    issuerRecord =
      await agent.modules.openid4VcIssuer.getIssuerByIssuerId(issuerId);
  } catch (e) {
    agent.config.logger.error(e);
    agent.config.logger.info("No issuer record stored, creating new issuer.");
  }

  if (issuerRecord) {
    // Update issuer metadata in case it has changed.
    await agent.modules.openid4VcIssuer.updateIssuerMetadata({
      issuerId: issuerId,
      display: issuerDisplay,
      credentialConfigurationsSupported: supportedCredentials,
    });
    agent.config.logger.info("Updated issuer metadata");
    return;
  }

  await agent.modules.openid4VcIssuer.createIssuer({
    issuerId: issuerId,
    display: issuerDisplay,
    credentialConfigurationsSupported: supportedCredentials,
  });
}

/**
 * Creates a verifier record in an agent's wallet if none exists.
 * Does nothing if the verifier record already exists.
 *
 * @param agent the agent to create the verifier record for
 * @param verifierId the DID of the verifier
 */
export async function setupVerifier(agent, verifierId) {
  let verifierRecord;

  try {
    verifierRecord =
      await agent.modules.openid4VcVerifier.getVerifierByVerifierId(verifierId);
  } catch (e) {
    agent.config.logger.error(e);
    agent.config.logger.info(
      "No verifier record stored, creating new verifier.",
    );
  }

  if (verifierRecord) return;

  await agent.modules.openid4VcVerifier.createVerifier({
    verifierId: verifierId,
  });
}
