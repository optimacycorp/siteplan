import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const commands = [
  [npmCommand, ["run", "test:units"]],
  [npmCommand, ["run", "lint", "--workspace", "@landportal/web"]],
  [npmCommand, ["run", "build", "--workspace", "@landportal/web"]],
];

for (const [command, args] of commands) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: false,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? 1}`));
    });

    child.on("error", reject);
  });
}
