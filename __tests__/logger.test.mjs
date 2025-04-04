import { MyLogger } from "../src/util/logger.mjs";
import { LogLevel } from "@credo-ts/core";

describe("logger tests", () => {
  const consoleErrorSpy = vi.spyOn(console, "error");
  const consoleWarnSpy = vi.spyOn(console, "warn");
  const consoleInfoSpy = vi.spyOn(console, "info");
  const consoleDebugSpy = vi.spyOn(console, "debug");
  const consoleLogSpy = vi.spyOn(console, "log");

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("log level off", () => {
    const logger = new MyLogger(LogLevel.off);

    it("should not log fatal message", () => {
      logger.fatal("test");

      expect(consoleErrorSpy).toBeCalledTimes(0);
    });

    it("should not log error message", () => {
      logger.error("test");

      expect(consoleErrorSpy).toBeCalledTimes(0);
    });

    it("should not log warn message", () => {
      logger.warn("test");

      expect(consoleWarnSpy).toBeCalledTimes(0);
    });

    it("should not log info message", () => {
      logger.info("test");

      expect(consoleInfoSpy).toBeCalledTimes(0);
    });

    it("should not log debug message", () => {
      logger.debug("test");

      expect(consoleDebugSpy).toBeCalledTimes(0);
    });

    it("should not log trace message", () => {
      logger.trace("test");

      expect(consoleLogSpy).toBeCalledTimes(0);
    });

    it("should not log test message", () => {
      logger.test("test");

      expect(consoleLogSpy).toBeCalledTimes(0);
    });
  });

  describe("log level test", () => {
    const logger = new MyLogger(LogLevel.test);

    describe("simple message", () => {
      it("should log fatal message", () => {
        logger.fatal("test");

        expect(consoleErrorSpy).toBeCalledTimes(1);
        expect(consoleErrorSpy).toBeCalledWith("FATAL: test", "");
      });

      it("should log error message", () => {
        logger.error("test");

        expect(consoleErrorSpy).toBeCalledTimes(1);
        expect(consoleErrorSpy).toBeCalledWith("ERROR: test", "");
      });

      it("should log warn message", () => {
        logger.warn("test");

        expect(consoleWarnSpy).toBeCalledTimes(1);
        expect(consoleWarnSpy).toBeCalledWith("WARN: test", "");
      });

      it("should log info message", () => {
        logger.info("test");

        expect(consoleInfoSpy).toBeCalledTimes(1);
        expect(consoleInfoSpy).toBeCalledWith("INFO: test", "");
      });

      it("should log debug message", () => {
        logger.debug("test");

        expect(consoleDebugSpy).toBeCalledTimes(1);
        expect(consoleDebugSpy).toBeCalledWith("DEBUG: test", "");
      });

      it("should log trace message", () => {
        logger.trace("test");

        expect(consoleLogSpy).toBeCalledTimes(1);
        expect(consoleLogSpy).toBeCalledWith("TRACE: test", "");
      });

      it("should log test message", () => {
        logger.test("test");

        expect(consoleLogSpy).toBeCalledTimes(1);
        expect(consoleLogSpy).toBeCalledWith("TEST: test", "");
      });
    });

    describe("message with data", () => {
      const object = {
        data: "test",
      };
      const expectedObjectString = '{\n  "data": "test"\n}';

      it("should log fatal message with data", () => {
        logger.fatal("test", object);

        expect(consoleErrorSpy).toBeCalledTimes(1);
        expect(consoleErrorSpy).toBeCalledWith(
          "FATAL: test",
          expectedObjectString,
        );
      });

      it("should log error message with data", () => {
        logger.error("test", object);

        expect(consoleErrorSpy).toBeCalledTimes(1);
        expect(consoleErrorSpy).toBeCalledWith(
          "ERROR: test",
          expectedObjectString,
        );
      });

      it("should log warn message with data", () => {
        logger.warn("test", object);

        expect(consoleWarnSpy).toBeCalledTimes(1);
        expect(consoleWarnSpy).toBeCalledWith(
          "WARN: test",
          expectedObjectString,
        );
      });

      it("should log info message with data", () => {
        logger.info("test", object);

        expect(consoleInfoSpy).toBeCalledTimes(1);
        expect(consoleInfoSpy).toBeCalledWith(
          "INFO: test",
          expectedObjectString,
        );
      });

      it("should log debug message with data", () => {
        logger.debug("test", object);

        expect(consoleDebugSpy).toBeCalledTimes(1);
        expect(consoleDebugSpy).toBeCalledWith(
          "DEBUG: test",
          expectedObjectString,
        );
      });

      it("should log trace message with data", () => {
        logger.trace("test", object);

        expect(consoleLogSpy).toBeCalledTimes(1);
        expect(consoleLogSpy).toBeCalledWith(
          "TRACE: test",
          expectedObjectString,
        );
      });

      it("should log test message with data", () => {
        logger.test("test", object);

        expect(consoleLogSpy).toBeCalledTimes(1);
        expect(consoleLogSpy).toBeCalledWith(
          "TEST: test",
          expectedObjectString,
        );
      });
    });
  });
});
