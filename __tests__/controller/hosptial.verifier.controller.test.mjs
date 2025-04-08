import express from "express";
import request from "supertest";
import { LogLevel } from "@credo-ts/core";

import {
  HOSPITAL_VERIFIER_PRESCRIPTIONS_PATH,
  HOSPITAL_VERIFIER_ROUTER_PATH,
  setupHospitalVerifierRouter,
} from "#src/controller/hospital.verifier.controller.mjs";
import { MyLogger } from "#src/util/logger.mjs";

describe("hospital verifier controller tests", () => {
  let app;
  let server;

  const createPrescriptionVerificationRequestMock = vi.hoisted(() => vi.fn());
  vi.mock("#src/service/hospital.verifier.service.mjs", () => ({
    createPrescriptionVerificationRequest:
      createPrescriptionVerificationRequestMock,
  }));

  const simpleAgentMock = {
    config: {
      logger: new MyLogger(LogLevel.off),
    },
  };

  beforeEach(() => {
    app = express();
    app.use(
      HOSPITAL_VERIFIER_ROUTER_PATH,
      setupHospitalVerifierRouter(simpleAgentMock, "verifier"),
    );
    app.use(express.static("public"));
    app.set("view engine", "pug");
    server = app.listen(3003);
  });

  afterEach(() => {
    server.close((error) => {
      console.error(error);
    });
    vi.clearAllMocks();
  });

  it("should send 200 when getting root route", async () => {
    createPrescriptionVerificationRequestMock.mockResolvedValue(
      "verification-request",
    );

    const response = await request(app).get(HOSPITAL_VERIFIER_ROUTER_PATH);
    expect(response.status).toBe(200);
  });

  it(`should send 200 when getting ${HOSPITAL_VERIFIER_ROUTER_PATH + HOSPITAL_VERIFIER_PRESCRIPTIONS_PATH}`, async () => {
    createPrescriptionVerificationRequestMock.mockResolvedValue(
      "verification-request",
    );

    const response = await request(app).get(
      HOSPITAL_VERIFIER_ROUTER_PATH + HOSPITAL_VERIFIER_PRESCRIPTIONS_PATH,
    );
    expect(response.status).toBe(200);
  });

  it(`should log error and send 200 when getting ${HOSPITAL_VERIFIER_ROUTER_PATH + HOSPITAL_VERIFIER_PRESCRIPTIONS_PATH} and request link can not be converted to QR code`, async () => {
    createPrescriptionVerificationRequestMock.mockResolvedValue(null);

    const loggerErrorMock = vi.spyOn(simpleAgentMock.config.logger, "error");

    const response = await request(app).get(
      HOSPITAL_VERIFIER_ROUTER_PATH + HOSPITAL_VERIFIER_PRESCRIPTIONS_PATH,
    );
    expect(response.status).toBe(200);
    expect(loggerErrorMock).toHaveBeenCalledTimes(1);
  });
});
