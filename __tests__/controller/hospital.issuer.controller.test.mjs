import express from "express";
import request from "supertest";
import { parseDid, LogLevel } from "@credo-ts/core";

import {
  HOSPITAL_ISSUER_PRESCRIPTIONS_PATH,
  HOSPITAL_ISSUER_ROUTER_PATH,
  setupHospitalIssuerRouter,
} from "#src/controller/hospital.issuer.controller.mjs";
import { getMedicationRequest } from "#src/service/smart.service.mjs";
import { createPrescriptionOffer } from "#src/service/hospital.issuer.service.mjs";
import { getSimpleAgentMock } from "../helpers/mockAgent.mjs";

describe("hospital issuer controller tests", () => {
  let app;
  let server;

  vi.mock("#src/service/smart.service.mjs", async () => {
    const { sampleMedicationRequest } = await import(
      "../__data__/smartSampleData.mjs"
    );

    return {
      getCheckSmartSessionMiddleware: vi.fn().mockImplementation(() => {
        return (req, res, next) => next();
      }),
      getAllMedicationRequests: vi.fn().mockResolvedValue({
        entry: [
          {
            resource: sampleMedicationRequest,
          },
        ],
      }),
      getMedicationRequest: vi.fn().mockImplementation((id) => {
        if (id === sampleMedicationRequest.id) return sampleMedicationRequest;
        throw new Error("Invalid ID");
      }),
    };
  });
  vi.mock("#src/service/hospital.issuer.service.mjs", () => ({
    createPrescriptionOffer: vi.fn().mockResolvedValue("offer"),
  }));
  vi.mock("@credo-ts/core", async () => {
    const originalModule = await vi.importActual("@credo-ts/core");
    return {
      ...originalModule,
      parseDid: vi.fn(originalModule.parseDid),
    };
  });

  const simpleAgentMock = getSimpleAgentMock(LogLevel.off);

  beforeEach(() => {
    app = express();
    app.use(
      HOSPITAL_ISSUER_ROUTER_PATH,
      setupHospitalIssuerRouter(simpleAgentMock, "issuer"),
    );
    app.use(express.static("public"));
    app.set("view engine", "pug");
    server = app.listen(3002);
  });

  afterEach(() => {
    server.close((error) => {
      console.error(error);
    });
    vi.clearAllMocks();
  });

  it("should send 200 when getting root route", async () => {
    const response = await request(app).get(HOSPITAL_ISSUER_ROUTER_PATH);
    expect(response.status).toBe(200);
  });

  it(`should send 200 when getting ${HOSPITAL_ISSUER_ROUTER_PATH + HOSPITAL_ISSUER_PRESCRIPTIONS_PATH} route`, async () => {
    const response = await request(app).get(
      HOSPITAL_ISSUER_ROUTER_PATH + HOSPITAL_ISSUER_PRESCRIPTIONS_PATH,
    );
    expect(response.status).toBe(200);
  });

  it(`should send 200 when getting ${HOSPITAL_ISSUER_ROUTER_PATH + HOSPITAL_ISSUER_PRESCRIPTIONS_PATH}/:id/offer with valid id and query parameters`, async () => {
    const response = await request(app).get(
      `${HOSPITAL_ISSUER_ROUTER_PATH + HOSPITAL_ISSUER_PRESCRIPTIONS_PATH}/100/offer?validity=1&recipient=did:example:123`,
    );
    expect(response.status).toBe(200);
    expect(getMedicationRequest).toHaveBeenCalledTimes(1);
    expect(getMedicationRequest).toHaveBeenCalledWith("100");
    expect(parseDid).toHaveBeenCalledTimes(1);
    expect(parseDid).toHaveBeenCalledWith("did:example:123");
    expect(createPrescriptionOffer).toHaveBeenCalledTimes(1);
    expect(createPrescriptionOffer).toHaveBeenCalledWith(
      simpleAgentMock,
      "issuer",
      "100",
      1,
      "did:example:123",
    );
  });

  it(`should send 404 when getting ${HOSPITAL_ISSUER_ROUTER_PATH + HOSPITAL_ISSUER_PRESCRIPTIONS_PATH} with invalid id`, async () => {
    const response = await request(app).get(
      `${HOSPITAL_ISSUER_ROUTER_PATH + HOSPITAL_ISSUER_PRESCRIPTIONS_PATH}/1/offer?validity=1`,
    );
    expect(response.status).toBe(404);
    expect(getMedicationRequest).toHaveBeenCalledTimes(1);
    expect(getMedicationRequest).toHaveBeenCalledWith("1");
    expect(parseDid).toHaveBeenCalledTimes(0);
    expect(createPrescriptionOffer).toHaveBeenCalledTimes(0);
  });

  it(`should send 200 but nop create offer when getting ${HOSPITAL_ISSUER_ROUTER_PATH + HOSPITAL_ISSUER_PRESCRIPTIONS_PATH} with invalid recipient did`, async () => {
    const response = await request(app).get(
      `${HOSPITAL_ISSUER_ROUTER_PATH + HOSPITAL_ISSUER_PRESCRIPTIONS_PATH}/100/offer?validity=1&recipient=sheesh`,
    );
    expect(response.status).toBe(200);
    expect(getMedicationRequest).toHaveBeenCalledTimes(1);
    expect(getMedicationRequest).toHaveBeenCalledWith("100");
    expect(parseDid).toHaveBeenCalledTimes(1);
    expect(parseDid).toHaveBeenCalledWith("sheesh");
    expect(createPrescriptionOffer).toHaveBeenCalledTimes(0);
  });
});
