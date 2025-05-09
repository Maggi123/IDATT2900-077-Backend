import fs from "fs";
import readline from "readline";

import axios from "axios";
import { vol } from "memfs";

import {
  Agent,
  ClaimFormat,
  LogLevel,
  parseDid,
  W3cCredential,
} from "@credo-ts/core";

import { MyLogger } from "#src/util/logger.mjs";
import {
  setupIssuer,
  setupVerifier,
  credentialRequestToCredentialMapperFunction,
  initializeAgent,
  setDid,
  supportedCredentials,
} from "#src/service/agent.service.mjs";
import { getSimpleAgentMock } from "../helpers/mockAgent.mjs";
import { hospitalDisplay } from "#src/service/hospital.issuer.service.mjs";

describe("agent service tests", () => {
  const axiosGetMock = vi.hoisted(() => vi.fn());
  vi.mock("fs");
  vi.mock("@credo-ts/core");
  vi.mock("axios", () => ({
    default: {
      get: axiosGetMock,
    },
  }));
  vi.mock("#src/service/hospital.issuer.service.mjs");

  const simpleAgentMock = getSimpleAgentMock(LogLevel.off);

  beforeEach(() => {
    fs.mkdirSync(process.cwd(), { recursive: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vol.reset();
  });

  describe("setupIssuer", () => {
    const getIssuerByIdMock = vi.spyOn(
      simpleAgentMock.modules.openid4VcIssuer,
      "getIssuerByIssuerId",
    );

    it("should create new issuer if it does not exist", async () => {
      const createIssuerMock = vi.spyOn(
        simpleAgentMock.modules.openid4VcIssuer,
        "createIssuer",
      );

      getIssuerByIdMock.mockRejectedValue(new Error("does not exist"));
      createIssuerMock.mockImplementation(vi.fn());

      await setupIssuer(simpleAgentMock, "issuer", hospitalDisplay);

      expect(getIssuerByIdMock).toHaveBeenCalledTimes(1);
      expect(getIssuerByIdMock).toHaveBeenCalledWith("issuer");
      expect(createIssuerMock).toHaveBeenCalledTimes(1);
      expect(createIssuerMock).toHaveBeenCalledWith({
        issuerId: "issuer",
        display: hospitalDisplay,
        credentialConfigurationsSupported: supportedCredentials,
      });
    });

    it("should update issuer if exists", async () => {
      const updateIssuerMetadataMock = vi.spyOn(
        simpleAgentMock.modules.openid4VcIssuer,
        "updateIssuerMetadata",
      );

      getIssuerByIdMock.mockResolvedValue("exists");
      updateIssuerMetadataMock.mockImplementation(vi.fn());

      await setupIssuer(simpleAgentMock, "issuer", hospitalDisplay);

      expect(getIssuerByIdMock).toHaveBeenCalledTimes(1);
      expect(getIssuerByIdMock).toHaveBeenCalledWith("issuer");
      expect(updateIssuerMetadataMock).toHaveBeenCalledTimes(1);
      expect(updateIssuerMetadataMock).toHaveBeenCalledWith({
        issuerId: "issuer",
        display: hospitalDisplay,
        credentialConfigurationsSupported: supportedCredentials,
      });
    });
  });

  describe("setupVerifier", () => {
    const createVerifierMock = vi.spyOn(
      simpleAgentMock.modules.openid4VcVerifier,
      "createVerifier",
    );

    const getVerifierByVerifierIdMock = vi.spyOn(
      simpleAgentMock.modules.openid4VcVerifier,
      "getVerifierByVerifierId",
    );

    it("should create new verifier if it does not exist", async () => {
      getVerifierByVerifierIdMock.mockRejectedValue(
        new Error("does not exist"),
      );
      createVerifierMock.mockImplementation(vi.fn());

      await setupVerifier(simpleAgentMock, "verifier", "name");

      expect(getVerifierByVerifierIdMock).toHaveBeenCalledTimes(1);
      expect(getVerifierByVerifierIdMock).toHaveBeenCalledWith("verifier");
      expect(createVerifierMock).toHaveBeenCalledTimes(1);
      expect(createVerifierMock).toHaveBeenCalledWith({
        verifierId: "verifier",
        clientMetadata: {
          client_name: "name",
        },
      });
    });

    it("should update verifier if it exists", async () => {
      const updateVerifierMetadataMock = vi.spyOn(
        simpleAgentMock.modules.openid4VcVerifier,
        "updateVerifierMetadata",
      );

      getVerifierByVerifierIdMock.mockResolvedValue("verifier");
      updateVerifierMetadataMock.mockImplementation(vi.fn());

      await setupVerifier(simpleAgentMock, "verifier", "name");

      expect(getVerifierByVerifierIdMock).toHaveBeenCalledTimes(1);
      expect(getVerifierByVerifierIdMock).toHaveBeenCalledWith("verifier");
      expect(updateVerifierMetadataMock).toHaveBeenCalledTimes(1);
      expect(updateVerifierMetadataMock).toHaveBeenCalledWith({
        verifierId: "verifier",
        clientMetadata: {
          client_name: "name",
        },
      });
      expect(createVerifierMock).toHaveBeenCalledTimes(0);
    });
  });

  describe("initializeAgent", () => {
    it("should try to fetch genesis transactions with undefined ip when environment variable is not set and initialize agent when fetch was successful", async () => {
      axiosGetMock.mockResolvedValue({
        status: 200,
      });

      const agent = await initializeAgent(new MyLogger(LogLevel.off));

      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(axios.get).toHaveBeenCalledWith("http://undefined:9000/genesis");
      expect(Agent.prototype.constructor).toHaveBeenCalledTimes(1);
      expect(agent).toBeInstanceOf(Agent);
    });

    it("should try to fetch genesis transactions with undefined ip when environment variable is not set and throw error when fetch was not successful", async () => {
      axiosGetMock.mockResolvedValue({
        status: 500,
      });

      await expect(initializeAgent()).rejects.toThrow();
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(axios.get).toHaveBeenCalledWith("http://undefined:9000/genesis");
      expect(Agent.prototype.constructor).toHaveBeenCalledTimes(0);
    });

    it("should try to fetch genesis transactions with defined ip when environment variable is set and initialize agent when fetch was successful", async () => {
      vi.stubEnv("BACKEND_INDY_NETWORK_IP", "10.0.0.1");
      axiosGetMock.mockResolvedValue({
        status: 200,
      });

      const agent = await initializeAgent(new MyLogger(LogLevel.off));

      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(axios.get).toHaveBeenCalledWith("http://10.0.0.1:9000/genesis");
      expect(Agent.prototype.constructor).toHaveBeenCalledTimes(1);
      expect(agent).toBeInstanceOf(Agent);
    });
  });

  describe("setDid", () => {
    const readFileSyncSpy = vi.spyOn(fs, "readFileSync");
    const getCreatedDidsMock = vi.spyOn(simpleAgentMock.dids, "getCreatedDids");

    const createInterfaceMock = vi.spyOn(readline, "createInterface");
    const mockInterface = {
      question: vi.fn().mockImplementation((_, callback) => {
        callback("answer");
      }),
      close: vi.fn(),
    };
    createInterfaceMock.mockReturnValue(mockInterface);

    const createMock = vi.spyOn(simpleAgentMock.dids, "create");

    it("should return the did in the did.txt file if one is already created", async () => {
      getCreatedDidsMock.mockResolvedValue(["did"]);

      fs.writeFileSync("did.txt", "did");

      const did = await setDid(simpleAgentMock);

      expect(did).toBe("did");
      expect(getCreatedDidsMock).toHaveBeenCalledTimes(1);
      expect(getCreatedDidsMock).toHaveBeenCalledWith({ method: "indy" });
      expect(readFileSyncSpy).toHaveBeenCalledTimes(1);
      expect(readFileSyncSpy).toHaveBeenCalledWith("did.txt");
    });

    it("should exit process if did.txt file does not exist", async () => {
      const exitSpy = vi.spyOn(process, "exit");
      exitSpy.mockImplementation(vi.fn());

      getCreatedDidsMock.mockResolvedValue(["did"]);

      const did = await setDid(simpleAgentMock);

      expect(did).toBeUndefined();
      expect(getCreatedDidsMock).toHaveBeenCalledTimes(1);
      expect(getCreatedDidsMock).toHaveBeenCalledWith({ method: "indy" });
      expect(readFileSyncSpy).toHaveBeenCalledTimes(1);
      expect(readFileSyncSpy).toHaveBeenCalledWith("did.txt");
      expect(exitSpy).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("should create a did if there are none", async () => {
      createMock.mockResolvedValue({
        didState: {
          nymRequest: JSON.stringify({
            operation: {
              verkey: "verkey",
            },
          }),
          did: "did:example:123",
          state: "finished",
        },
      });

      const importMock = vi.spyOn(simpleAgentMock.dids, "import");
      importMock.mockImplementation(vi.fn());

      const writeFileSpy = vi.spyOn(fs, "writeFile");

      getCreatedDidsMock.mockResolvedValue([]);

      const did = await setDid(simpleAgentMock);

      expect(did).toBe("did:example:123");
      expect(getCreatedDidsMock).toHaveBeenCalledTimes(1);
      expect(getCreatedDidsMock).toHaveBeenCalledWith({ method: "indy" });
      expect(createInterfaceMock).toHaveBeenCalledTimes(1);
      expect(createInterfaceMock).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout,
      });
      expect(mockInterface.question).toHaveBeenCalledTimes(2);
      expect(createMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledWith({
        method: "indy",
        options: {
          endorserDid: "did:indy:local:answer",
          endorserMode: "external",
        },
      });
      expect(importMock).toHaveBeenCalledTimes(1);
      expect(importMock).toHaveBeenCalledWith({
        did: "did:example:123",
      });
      expect(writeFileSpy).toHaveBeenCalledTimes(1);
    });

    it("should create a did if there are none and exit if the process fails", async () => {
      createMock.mockResolvedValue({
        didState: {
          state: "failed",
        },
      });

      getCreatedDidsMock.mockResolvedValue([]);

      const exitSpy = vi.spyOn(process, "exit");
      exitSpy.mockImplementation(vi.fn());

      await setDid(simpleAgentMock);

      expect(getCreatedDidsMock).toHaveBeenCalledTimes(1);
      expect(getCreatedDidsMock).toHaveBeenCalledWith({ method: "indy" });
      expect(createInterfaceMock).toHaveBeenCalledTimes(1);
      expect(createInterfaceMock).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout,
      });
      expect(mockInterface.question).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledWith({
        method: "indy",
        options: {
          endorserDid: "did:indy:local:answer",
          endorserMode: "external",
        },
      });
      expect(exitSpy).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("credentialRequestToCredentialMapperFunction", async () => {
    const actualParseDid = (await vi.importActual("@credo-ts/core")).parseDid;
    parseDid.mockImplementation(actualParseDid);

    const issuanceSession = {
      issuerId: "did:example:456",
      issuanceMetadata: {
        prescriptionId: "1",
        validityDays: "1",
        recipientDid: "did:example:123",
      },
    };

    const credentialConfigurationIds = ["Prescription"];

    it("should return credentials when the holder binding is a DID and it equals the recipient DID", async () => {
      const holderBindings = [
        {
          method: "did",
          didUrl: "did:example:123",
        },
      ];

      const credentialsForSigning =
        await credentialRequestToCredentialMapperFunction({
          issuanceSession,
          credentialConfigurationIds,
          holderBindings,
          credentialConfigurationsSupported: supportedCredentials,
        });

      expect(credentialsForSigning).toBeDefined();
      expect(credentialsForSigning.credentialConfigurationId).toBe(
        "Prescription",
      );
      expect(credentialsForSigning.format).toBe(ClaimFormat.JwtVc);
      expect(credentialsForSigning.credentials.length).toBe(1);
      expect(
        credentialsForSigning.credentials[0].credential instanceof
          W3cCredential,
      ).toBeTruthy();
      expect(credentialsForSigning.credentials[0].verificationMethod).toBe(
        "did:example:456#key-1",
      );
    });

    it("should throw an error when the holder binding is a DID and it does not equal the recipient DID", async () => {
      const holderBindings = [
        {
          method: "did",
          didUrl: "did:example:789",
        },
      ];

      await expect(
        credentialRequestToCredentialMapperFunction({
          issuanceSession,
          credentialConfigurationIds,
          holderBindings,
          credentialConfigurationsSupported: supportedCredentials,
        }),
      ).rejects.toThrow();
    });

    it("should throw an error when the holder binding is not a DID", async () => {
      const holderBindings = [
        {
          key: "key",
        },
      ];

      await expect(
        credentialRequestToCredentialMapperFunction({
          issuanceSession,
          credentialConfigurationIds,
          holderBindings,
          credentialConfigurationsSupported: supportedCredentials,
        }),
      ).rejects.toThrow();
    });
  });
});
