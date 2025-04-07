import express from "express";
import request from "supertest";
import {
  DID_ROUTER_PATH,
  setupDidRouter,
} from "#src/controller/did.controller.mjs";
import { createDid } from "#src/service/did.service.mjs";

describe("did controller tests", () => {
  let app;
  let server;

  const createDidMock = vi.hoisted(() => vi.fn());
  vi.mock("#src/service/did.service.mjs", () => ({
    createDid: createDidMock,
  }));

  beforeEach(() => {
    app = express();
    app.use(DID_ROUTER_PATH, setupDidRouter(undefined, undefined));
    server = app.listen(3000);
  });

  afterEach(() => {
    server.close((error) => {
      console.error(error);
    });
    vi.resetAllMocks();
  });

  it("should try to create DID and send 200 when successful", async () => {
    createDidMock.mockResolvedValue([
      {
        didState: {
          state: "success",
          did: "did:example:123",
        },
      },
      "seed",
    ]);

    const response = await request(app).get(DID_ROUTER_PATH);
    expect(createDid).toHaveBeenCalledTimes(1);
    expect(createDid).toHaveBeenCalledWith(undefined, undefined);
    expect(response.status).toBe(200);
    expect(response.body.didUrl).toBe("did:example:123");
    expect(response.body.seed).toBe("seed");
  });

  it("should try to create DID and send 500 when not successful", async () => {
    createDidMock.mockResolvedValue([
      {
        didState: {
          state: "failed",
        },
      },
      "seed",
    ]);

    const response = await request(app).get(DID_ROUTER_PATH);
    expect(response.status).toBe(500);
    expect(response.body).toStrictEqual({});
    expect(createDid).toHaveBeenCalledTimes(1);
    expect(createDid).toHaveBeenCalledWith(undefined, undefined);
  });

  it("should try to create DID and send 500 when an error is thrown", async () => {
    createDidMock.mockImplementation(async () => {
      throw new Error("error");
    });

    const response = await request(app).get(DID_ROUTER_PATH);
    expect(response.status).toBe(500);
    expect(createDid).toHaveBeenCalledTimes(1);
    expect(createDid).toHaveBeenCalledWith(undefined, undefined);
  });
});
