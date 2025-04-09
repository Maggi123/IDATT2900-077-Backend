import express from "express";
import request from "supertest";

import {
  HOSPITAL_ISSUER_PRESCRIPTIONS_PATH,
  HOSPITAL_ISSUER_ROUTER_PATH,
  setupHospitalIssuerRouter,
} from "#src/controller/hospital.issuer.controller.mjs";

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
    };
  });
  vi.mock("#src/service/hospital.issuer.service.mjs");

  beforeEach(() => {
    app = express();
    app.use(
      HOSPITAL_ISSUER_ROUTER_PATH,
      setupHospitalIssuerRouter(undefined, "issuer"),
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
});
