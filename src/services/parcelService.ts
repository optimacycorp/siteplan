import * as fixtureParcelService from "./fixtureParcelService";
import * as openParcelService from "./openParcelService";

const useFixtures = String(import.meta.env.VITE_USE_PARCEL_FIXTURES || "").toLowerCase() === "true";
const implementation = useFixtures ? fixtureParcelService : openParcelService;

export const {
  searchParcels,
  fetchParcelByUuid,
  fetchParcelAtPoint,
  fetchParcelCandidatesAtPoint,
  fetchParcelNeighbors,
} = implementation;
