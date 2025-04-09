import { OpenId4VcIssuerApi, OpenId4VcVerifierApi } from "@credo-ts/openid4vc";
import { Agent, LogLevel } from "@credo-ts/core";

import { MyLogger } from "#src/util/logger.mjs";
import {
  createIssuer,
  createVerifier,
  display,
  initializeAgent,
  supportedCredentials,
} from "#src/service/agent.service.mjs";
import axios from "axios";

describe("agent service tests", () => {
  const axiosGetMock = vi.hoisted(() => vi.fn());
  vi.mock("@credo-ts/core");
  vi.mock("axios", () => ({
    default: {
      get: axiosGetMock,
    },
  }));

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe("createIssuer", () => {
    const simpleAgentMock = {
      modules: {
        openid4VcIssuer: new OpenId4VcIssuerApi(
          undefined,
          undefined,
          undefined,
        ),
      },
      config: {
        logger: new MyLogger(LogLevel.off),
      },
    };

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

      await createIssuer(simpleAgentMock, "issuer");

      expect(getIssuerByIdMock).toHaveBeenCalledTimes(1);
      expect(getIssuerByIdMock).toHaveBeenCalledWith("issuer");
      expect(createIssuerMock).toHaveBeenCalledTimes(1);
      expect(createIssuerMock).toHaveBeenCalledWith({
        issuerId: "issuer",
        display: display,
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

      await createIssuer(simpleAgentMock, "issuer");

      expect(getIssuerByIdMock).toHaveBeenCalledTimes(1);
      expect(getIssuerByIdMock).toHaveBeenCalledWith("issuer");
      expect(updateIssuerMetadataMock).toHaveBeenCalledTimes(1);
      expect(updateIssuerMetadataMock).toHaveBeenCalledWith({
        issuerId: "issuer",
        display: display,
        credentialConfigurationsSupported: supportedCredentials,
      });
    });
  });

  describe("createVerifier", () => {
    const simpleAgentMock = {
      modules: {
        openid4VcVerifier: new OpenId4VcVerifierApi(
          undefined,
          undefined,
          undefined,
        ),
      },
      config: {
        logger: new MyLogger(LogLevel.off),
      },
    };

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

      await createVerifier(simpleAgentMock, "verifier");

      expect(getVerifierByVerifierIdMock).toHaveBeenCalledTimes(1);
      expect(getVerifierByVerifierIdMock).toHaveBeenCalledWith("verifier");
      expect(createVerifierMock).toHaveBeenCalledTimes(1);
      expect(createVerifierMock).toHaveBeenCalledWith({
        verifierId: "verifier",
      });
    });

    it("should not create enw verifier if it exists", async () => {
      getVerifierByVerifierIdMock.mockResolvedValue("verifier");

      await createVerifier(simpleAgentMock, "verifier");

      expect(getVerifierByVerifierIdMock).toHaveBeenCalledTimes(1);
      expect(getVerifierByVerifierIdMock).toHaveBeenCalledWith("verifier");
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
});
