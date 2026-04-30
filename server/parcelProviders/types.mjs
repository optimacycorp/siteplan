/**
 * Provider-neutral parcel lookup contracts for the open parcel stack.
 *
 * @typedef {Object} ParcelLookupInput
 * @property {number} lat
 * @property {number} lng
 * @property {string=} query
 * @property {string=} state
 * @property {string=} county
 *
 * @typedef {Object} ParcelLookupResult
 * @property {'found'|'not_found'|'rate_limited'|'error'} status
 * @property {'local-postgis'|'county-arcgis'|'state-public-parcels'|'regrid'|'none'} provider
 * @property {Array<object>} features
 * @property {string=} message
 * @property {{lat:number,lng:number}=} center
 */

export const PARCEL_PROVIDERS = Object.freeze({
  LOCAL_POSTGIS: "local-postgis",
  COUNTY_ARCGIS: "county-arcgis",
  STATE_PUBLIC_PARCELS: "state-public-parcels",
  REGRID: "regrid",
  NONE: "none",
});
