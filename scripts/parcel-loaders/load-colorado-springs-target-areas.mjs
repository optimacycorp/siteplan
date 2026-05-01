import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { IMPORT_PRESETS } from "./load-el-paso-county-parcels.mjs";

const PRESET_GROUPS = {
  core: [
    "rampart-click-7333200002",
    "cedar-heights-rampart",
  ],
  expanded: [
    "rampart-click-7333200002",
    "cedar-heights-rampart",
    "cedar-heights-north",
    "cedar-heights-south",
  ],
  broad: [
    "rampart-click-7333200002",
    "cedar-heights-rampart",
    "cedar-heights-north",
    "cedar-heights-south",
    "cedar-heights-broad",
    "garden-of-the-gods-corridor",
  ],
};

function parseArgs(argv) {
  const args = {
    dryRun: false,
    listGroups: false,
    group: "core",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") args.dryRun = true;
    if (arg === "--list-groups") args.listGroups = true;
    if (arg === "--group") args.group = String(argv[index + 1] || args.group).trim();
  }

  return args;
}

function runPreset(loaderPath, preset, dryRun) {
  return new Promise((resolve, reject) => {
    const args = [loaderPath, "--preset", preset];
    if (dryRun) args.push("--dry-run");

    const child = spawn(process.execPath, args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Preset "${preset}" failed with exit code ${code ?? 1}.`));
    });

    child.on("error", reject);
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.listGroups) {
    console.log(JSON.stringify({
      groups: Object.entries(PRESET_GROUPS).map(([key, presets]) => ({
        key,
        presets,
        descriptions: presets.map((preset) => ({
          preset,
          description: IMPORT_PRESETS[preset]?.description || "",
        })),
      })),
    }, null, 2));
    return;
  }

  const presets = PRESET_GROUPS[args.group];
  if (!presets) {
    throw new Error(`Unknown group "${args.group}". Use --list-groups to see available groups.`);
  }

  const loaderPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "load-el-paso-county-parcels.mjs");

  console.log(JSON.stringify({
    group: args.group,
    dryRun: args.dryRun,
    presets,
  }, null, 2));

  for (const preset of presets) {
    await runPreset(loaderPath, preset, args.dryRun);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
