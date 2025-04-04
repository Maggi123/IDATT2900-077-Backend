// Copied from Synthea R4 synthetic FHIR data. https://synthea.mitre.org/downloads
export const sampleMedicationRequest = {
  resourceType: "MedicationRequest",
  id: "100",
  meta: {
    versionId: "1",
    lastUpdated: "2020-06-11T15:26:55.251+00:00",
    source: "#JlcA0bg5xBW1iwXq",
    tag: [
      {
        system: "https://smarthealthit.org/tags",
        code: "synthea-5-2019",
      },
    ],
  },
  status: "stopped",
  intent: "order",
  medicationCodeableConcept: {
    coding: [
      {
        system: "http://www.nlm.nih.gov/research/umls/rxnorm",
        code: "310965",
        display: "Ibuprofen 200 MG Oral Tablet",
      },
    ],
    text: "Ibuprofen 200 MG Oral Tablet",
  },
  subject: {
    reference: "Patient/1",
  },
  encounter: {
    reference: "Encounter/97",
  },
  authoredOn: "2015-05-20T19:37:54-04:00",
  requester: {
    reference: "Practitioner/3",
  },
  dosageInstruction: [
    {
      sequence: 1,
      asNeededBoolean: true,
    },
  ],
};
