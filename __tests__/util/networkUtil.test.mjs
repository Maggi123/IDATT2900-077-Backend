import { getBackendPort, getBackendIp } from "../../src/util/networkUtil.mjs";

describe("network util tests", () => {
  describe("getBackendPort", () => {
    it("should return port 3000", () => {
      const port = getBackendPort();

      expect(port).toBe(3000);
    });
  });

  describe("getBackendIp", () => {
    it("should return ip 127.0.0.1", () => {
      const ip = getBackendIp();

      expect(ip).toBe("127.0.0.1");
    });

    it("should return env ip when set", () => {
      process.env.BACKEND_IP = "10.0.0.1";

      const ip = getBackendIp();

      expect(ip).toBe("10.0.0.1");
    });
  });
});
