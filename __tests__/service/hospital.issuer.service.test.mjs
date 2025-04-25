import { LogLevel } from "@credo-ts/core";
import { OpenId4VcIssuanceSessionState } from "@credo-ts/openid4vc";
import { OpenId4VcIssuanceSessionRecord } from "@credo-ts/openid4vc/build/openid4vc-issuer/repository";

import { sampleMedicationRequest } from "../__data__/smartSampleData.mjs";
import {
  getPrescriptionClaims,
  createPrescriptionOffer,
  getIssuanceSessionStateChangedEventHandlerForIssuanceSession,
} from "#src/service/hospital.issuer.service.mjs";
import { getSimpleAgentMock } from "../helpers/mockAgent.mjs";

describe("hospital issuer service tests", () => {
  const simpleAgentMock = getSimpleAgentMock(LogLevel.off);

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getPrescriptionClaims", () => {
    vi.mock("#src/util/prescriptionUtil.mjs", () => ({
      getRxNormInName: vi.fn().mockResolvedValue(null),
    }));

    vi.mock("#src/service/smart.service.mjs", () => ({
      getMedicationRequest: vi.fn().mockImplementation(async (id) => {
        if (`${id}` === sampleMedicationRequest.id)
          return sampleMedicationRequest;
        throw new Error();
      }),
    }));

    it("should return claims with valid id", async () => {
      const claims = await getPrescriptionClaims(100);

      expect(claims).toStrictEqual({
        name: sampleMedicationRequest.medicationCodeableConcept.text,
        authoredOn: sampleMedicationRequest.authoredOn,
        activeIngredient: undefined,
      });
    });

    it("should throw when id is not valid", async () => {
      await expect(getPrescriptionClaims(1)).rejects.toThrow();
    });
  });

  describe("createPrescriptionOffer", () => {
    it("should create prescription offer", async () => {
      const createCredentialOfferMock = vi.spyOn(
        simpleAgentMock.modules.openid4VcIssuer,
        "createCredentialOffer",
      );

      const eventOnMock = vi.spyOn(simpleAgentMock.events, "on");

      const mockedCredentialOfferReturn = {
        issuanceSession: new OpenId4VcIssuanceSessionRecord({
          state: OpenId4VcIssuanceSessionState.OfferCreated,
          issuer: "issuer",
          credentialOfferId: "credentialOfferId",
          credentialOfferPayload: undefined,
        }),
        credentialOffer: "credential-offer",
      };

      createCredentialOfferMock.mockResolvedValue(mockedCredentialOfferReturn);

      const result = await createPrescriptionOffer(
        simpleAgentMock,
        "test",
        1,
        1,
        "did:example:123",
      );

      expect(result).toBe(mockedCredentialOfferReturn.credentialOffer);
      expect(createCredentialOfferMock).toHaveBeenCalledTimes(1);
      expect(createCredentialOfferMock).toHaveBeenCalledWith({
        issuerId: "test",
        offeredCredentials: ["Prescription"],
        preAuthorizedCodeFlowConfig: {
          userPinRequired: false,
        },
        issuanceMetadata: {
          prescriptionId: 1,
          validityDays: 1,
          recipientDid: "did:example:123",
        },
      });
      expect(eventOnMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("getIssuanceSessionStateChangedEventHandlerForIssuanceSession", () => {
    const loggerInfoSpy = vi.spyOn(simpleAgentMock.config.logger, "info");

    it("should return a handler function that logs state change if is correct", () => {
      const handlerFunction =
        getIssuanceSessionStateChangedEventHandlerForIssuanceSession(
          simpleAgentMock,
          "id",
        );

      handlerFunction({
        payload: {
          issuanceSession: {
            id: "id",
            state: OpenId4VcIssuanceSessionState.OfferCreated,
          },
        },
      });

      expect(loggerInfoSpy).toHaveBeenCalledTimes(1);
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        "Issuance session state changed to ",
        OpenId4VcIssuanceSessionState.OfferCreated,
      );
    });
  });
});
