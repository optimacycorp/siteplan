import { spawnSync } from "node:child_process";

const issues = [];
const warnings = [];

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] || "0", 10);
if (!Number.isFinite(nodeMajor) || nodeMajor < 20) {
  issues.push(`Node 20+ is required. Current version: ${process.versions.node}`);
}

const pnpmCheck = spawnSync("pnpm", ["--version"], { encoding: "utf8", shell: true });
if (pnpmCheck.status !== 0) {
  issues.push("pnpm is not available. Run `corepack enable` and then `pnpm install`.");
}

const proxyBaseUrl = process.env.VITE_REGRID_PROXY_BASE_URL || "";
const fixtureMode = String(process.env.VITE_USE_PARCEL_FIXTURES || "").toLowerCase() === "true";

if (!proxyBaseUrl) {
  warnings.push("VITE_REGRID_PROXY_BASE_URL is not set. Production builds should point to /regrid/.");
}

if (!fixtureMode && !proxyBaseUrl) {
  warnings.push("Fixture mode is off and no proxy base URL is configured. Parcel search will fail.");
}

const payload = {
  ok: issues.length === 0,
  node: process.versions.node,
  pnpm: pnpmCheck.status === 0 ? (pnpmCheck.stdout || "").trim() : null,
  fixtureMode,
  proxyBaseUrl: proxyBaseUrl || null,
  issues,
  warnings,
};

console.log(JSON.stringify(payload, null, 2));

if (issues.length > 0) {
  process.exitCode = 1;
}
