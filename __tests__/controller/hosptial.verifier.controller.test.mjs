import express from "express";
import request from "supertest";
import { LogLevel } from "@credo-ts/core";

import {
  HOSPITAL_VERIFIER_PRESCRIPTIONS_PATH,
  HOSPITAL_VERIFIER_ROUTER_PATH,
  setupHospitalVerifierRouter,
} from "#src/controller/hospital.verifier.controller.mjs";
import { OpenId4VcVerifierEvents } from "@credo-ts/openid4vc";
import { EventSource } from "eventsource";
import { getSimpleAgentMock } from "../helpers/mockAgent.mjs";

describe("hospital verifier controller tests", () => {
  let app;
  let server;

  const createPrescriptionVerificationRequestMock = vi.hoisted(() => vi.fn());
  const getPrescriptionVerificationSessionStateChangeHandlerMock = vi.hoisted(
    () => vi.fn(),
  );
  vi.mock("#src/service/hospital.verifier.service.mjs", () => ({
    createPrescriptionVerificationRequest:
      createPrescriptionVerificationRequestMock,
    getPrescriptionVerificationSessionStateChangeHandler:
      getPrescriptionVerificationSessionStateChangeHandlerMock,
  }));

  const simpleAgentMock = getSimpleAgentMock(LogLevel.off);

  const getVerificationSessionByIdMock = vi.spyOn(
    simpleAgentMock.modules.openid4VcVerifier,
    "getVerificationSessionById",
  );

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
    createPrescriptionVerificationRequestMock.mockResolvedValue([null, null]);

    const loggerErrorMock = vi.spyOn(simpleAgentMock.config.logger, "error");

    const response = await request(app).get(
      HOSPITAL_VERIFIER_ROUTER_PATH + HOSPITAL_VERIFIER_PRESCRIPTIONS_PATH,
    );
    expect(response.status).toBe(200);
    expect(loggerErrorMock).toHaveBeenCalledTimes(1);
  });

  it("should send 404 when getting SSE endpoint for verification session that does not exist", async () => {
    getVerificationSessionByIdMock.mockRejectedValue(new Error("not found"));

    const response = await request(app).get(
      HOSPITAL_VERIFIER_ROUTER_PATH + "/verificationEvents/1",
    );
    expect(response.status).toBe(404);
    expect(getVerificationSessionByIdMock).toHaveBeenCalledTimes(1);
  });

  it("should write data when using EventSource with valid verification session SSE endpoint", async () => {
    const mockHandlerFunction = vi.fn();
    const eventsOnMock = vi.spyOn(simpleAgentMock.events, "on");
    const eventsOffMock = vi.spyOn(simpleAgentMock.events, "off");

    getVerificationSessionByIdMock.mockResolvedValue("exists");
    getPrescriptionVerificationSessionStateChangeHandlerMock.mockResolvedValue(
      mockHandlerFunction,
    );

    const eventSource = new EventSource(
      `http://localhost:3003${HOSPITAL_VERIFIER_ROUTER_PATH}/verificationEvents/1`,
    );
    eventSource.onmessage = (event) => {
      expect(event.data).toBe(
        "Connected to event stream for verification session with id 1",
      );
      eventSource.close();
    };

    await vi.waitFor(() => {
      if (eventSource.readyState !== EventSource.CLOSED) {
        throw new Error("event source not closed");
      }
    });

    expect(
      getPrescriptionVerificationSessionStateChangeHandlerMock,
    ).toHaveBeenCalledTimes(1);
    expect(eventsOnMock).toHaveBeenCalledTimes(1);
    expect(eventsOnMock).toHaveBeenCalledWith(
      OpenId4VcVerifierEvents.VerificationSessionStateChanged,
      mockHandlerFunction,
    );

    await vi.waitFor(() => {
      if (eventsOffMock.mock.calls.length !== 1) {
        throw new Error("event off function not called");
      }
    });

    expect(eventsOffMock).toHaveBeenCalledWith(
      OpenId4VcVerifierEvents.VerificationSessionStateChanged,
      mockHandlerFunction,
    );
  });
});
