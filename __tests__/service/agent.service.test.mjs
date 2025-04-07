import { OpenId4VcIssuerApi } from "@credo-ts/openid4vc";
import { MyLogger } from "#src/util/logger.mjs";
import { LogLevel } from "@credo-ts/core";
import {
  createIssuer,
  display,
  supportedCredentials,
} from "#src/service/agent.service.mjs";

describe("agent service tests", () => {
  afterEach(() => {
    vi.clearAllMocks();
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

      getIssuerByIdMock.mockImplementation(() => {
        throw new Error("does not exist");
      });
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
});
