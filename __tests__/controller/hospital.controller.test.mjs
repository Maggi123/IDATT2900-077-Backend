import express from "express";
import request from "supertest";

import {
  HOSPITAL_ROUTER_PATH,
  setupHospitalIssuerRouter,
} from "#src/controller/hospital.controller.mjs";

describe("hospital controller tests", () => {
  let app;
  let server;

  vi.mock("#src/service/hospital.service.mjs");
  vi.mock("#src/service/smart.service.mjs", () => ({
    getCheckSmartSessionMiddleware: vi.fn().mockImplementation(() => {
      return (req, res, next) => next();
    }),
  }));

  beforeEach(() => {
    app = express();
    app.use(
      HOSPITAL_ROUTER_PATH,
      setupHospitalIssuerRouter(undefined, "issuer"),
    );
    app.use(express.static("public"));
    app.set("view engine", "pug");
    server = app.listen(3000);
  });

  afterEach(() => {
    server.close((error) => {
      console.error(error);
    });
    vi.resetAllMocks();
  });

  it("should send 200 when getting root router path", async () => {
    const response = await request(app).get(HOSPITAL_ROUTER_PATH);
    expect(response.status).toBe(200);
  });
});
