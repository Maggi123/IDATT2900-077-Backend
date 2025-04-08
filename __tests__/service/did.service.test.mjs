import { DidsApi } from "@credo-ts/core";

import { createDid } from "#src/service/did.service.mjs";

describe("did service tests", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createDid", () => {
    it("should return creation result and seed", async () => {
      const simpleAgentMock = {
        dids: new DidsApi(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        ),
      };

      const createDidMock = vi.spyOn(simpleAgentMock.dids, "create");
      createDidMock.mockResolvedValue("success");

      const [creationResult, seed] = await createDid(simpleAgentMock, "test");

      expect(seed).toBeDefined();
      expect(seed.toString()).toHaveLength(32);
      expect(creationResult).toBe("success");
      expect(createDidMock).toHaveBeenCalledTimes(1);
      expect(createDidMock).toHaveBeenCalledWith({
        method: "indy",
        options: {
          endorserDid: "test",
          endorserMode: "internal",
        },
        secret: {
          seed: seed,
        },
      });
    });
  });
});
