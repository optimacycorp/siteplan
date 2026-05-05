export {
  describeParcelSource,
  fetchParcelAtPointViaRegistry as fetchParcelAtPoint,
  fetchParcelByUuidViaRegistry as fetchParcelByUuid,
  fetchParcelCandidatesAtPointViaRegistry as fetchParcelCandidatesAtPoint,
  fetchParcelNeighborsViaRegistry as fetchParcelNeighbors,
  geocodeAddressCandidatesViaRegistry as geocodeAddressCandidates,
  listParcelProviders,
  resolveSearchProvider,
  searchParcelsViaRegistry as searchParcels,
} from "../data/providers/parcels/providerRegistry";
