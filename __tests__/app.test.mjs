import { LogLevel } from "@credo-ts/core";

import { setupApp } from "#src/app.mjs";
import {
  createIssuer,
  createVerifier,
  initializeAgent,
  setDid,
} from "#src/service/agent.service.mjs";
import { getSimpleAgentMock } from "./helpers/mockAgent.mjs";
import { MyLogger } from "#src/util/logger.mjs";

describe("app tests", () => {
  vi.mock("#src/service/agent.service.mjs", { spy: true });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe("setupApp", () => {
    it("should exit if it fails initializing agent", async () => {
      vi.stubEnv("BACKEND_INDY_NETWORK_IP", "undefined");

      const exitSpy = vi.spyOn(process, "exit").mockImplementation(vi.fn());

      await setupApp();

      expect(exitSpy).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("should return app and logger if it initializes successfully", async () => {
      const simpleAgentMock = getSimpleAgentMock(LogLevel.off);

      const resolveDidDocumentMock = vi.spyOn(
        simpleAgentMock.dids,
        "resolveDidDocument",
      );
      resolveDidDocumentMock.mockImplementation(vi.fn());

      initializeAgent.mockResolvedValue(simpleAgentMock);
      setDid.mockResolvedValue("did:indy:local:V4SGRU86Z58d6TV7PBUe6f");
      createIssuer.mockImplementation(vi.fn());
      createVerifier.mockImplementation(vi.fn());

      const [app, logger] = await setupApp();

      expect(app).toBeDefined();
      expect(logger).toBeDefined();
      expect(logger instanceof MyLogger).toBeTruthy();
    });
  });
});
