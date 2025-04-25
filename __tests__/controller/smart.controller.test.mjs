import request from "supertest";
import express from "express";

import {
  setupSmartRouter,
  SMART_ROUTER_PATH,
} from "#src/controller/smart.controller.mjs";

describe("smart controller tests", () => {
  let app;
  let server;

  beforeEach(() => {
    app = express();
    app.use(SMART_ROUTER_PATH, setupSmartRouter(undefined, "verifier"));
    app.use(express.static("public"));
    app.set("view engine", "pug");
    server = app.listen(3004);
  });

  afterEach(() => {
    server.close((error) => {
      console.error(error);
    });
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it(`should send 200 when getting ${SMART_ROUTER_PATH}/session_expired route`, async () => {
    const response = await request(app).get(
      `${SMART_ROUTER_PATH}/session_expired`,
    );
    expect(response.status).toBe(200);
  });

  it(`should send 500 when getting ${SMART_ROUTER_PATH}/launch route when smart server is not available`, async () => {
    vi.stubEnv("SMART_URL", "undefined");

    const response = await request(app).get(`${SMART_ROUTER_PATH}/launch`);
    expect(response.status).toBe(500);
  });
});
