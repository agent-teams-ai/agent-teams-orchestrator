import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VALE_VERSION = "3.15.2";
const RELEASE_BASE_URL =
  `https://github.com/vale-cli/vale/releases/download/v${VALE_VERSION}`;
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const assets = new Map([
  [
    "darwin-arm64",
    {
      archive: `vale_${VALE_VERSION}_macOS_arm64.tar.gz`,
      checksum:
        "d3f613ff9226935ace08895fc8557206f309cdbd3a81881d86b6ab5b8b408757",
      format: "tar",
    },
  ],
  [
    "darwin-x64",
    {
      archive: `vale_${VALE_VERSION}_macOS_64-bit.tar.gz`,
      checksum:
        "5d56b292f1612758f6d9e8d735dd739aec4e475830d0ba8c1e0ef7d8f08fa198",
      format: "tar",
    },
  ],
  [
    "linux-arm64",
    {
      archive: `vale_${VALE_VERSION}_Linux_arm64.tar.gz`,
      checksum:
        "e8240a3304e2c07b0476d30423f241a80296865cf6d2b78b128fb7e4e14cbb69",
      format: "tar",
    },
  ],
  [
    "linux-x64",
    {
      archive: `vale_${VALE_VERSION}_Linux_64-bit.tar.gz`,
      checksum:
        "fc72e64454d6bd7af91905d4faebbf411bae3eec17bb572f4101311212bc0d9e",
      format: "tar",
    },
  ],
  [
    "win32-x64",
    {
      archive: `vale_${VALE_VERSION}_Windows_64-bit.zip`,
      checksum:
        "062834458ab700ffb3a9fbb02099762efc9f48a62e1a88b835674d729af03ddc",
      format: "zip",
    },
  ],
]);

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      stdio: "inherit",
      ...options,
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} terminated by ${signal}`));
        return;
      }
      resolve(code ?? 1);
    });
  });
}

async function fileExists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function download(url, destination) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Vale download failed with HTTP ${response.status}: ${url}`);
  }
  await writeFile(destination, Buffer.from(await response.arrayBuffer()), {
    flag: "wx",
  });
}

async function verifyChecksum(filePath, expectedChecksum) {
  const digest = createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
  if (digest !== expectedChecksum) {
    throw new Error(
      `Vale archive checksum mismatch: expected ${expectedChecksum}, got ${digest}`,
    );
  }
}

async function extractArchive(asset, archivePath, destination) {
  if (asset.format === "tar") {
    const code = await run(
      "tar",
      ["-xzf", archivePath, "-C", destination],
      { cwd: repositoryRoot },
    );
    if (code !== 0) {
      throw new Error(`tar exited with code ${code}`);
    }
    return;
  }

  const escapedArchive = archivePath.replaceAll("'", "''");
  const escapedDestination = destination.replaceAll("'", "''");
  const code = await run(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `Expand-Archive -LiteralPath '${escapedArchive}' -DestinationPath '${escapedDestination}' -Force`,
    ],
    { cwd: repositoryRoot },
  );
  if (code !== 0) {
    throw new Error(`PowerShell Expand-Archive exited with code ${code}`);
  }
}

async function installVale(asset, installDirectory, binaryPath) {
  const parentDirectory = path.dirname(installDirectory);
  const temporaryDirectory = path.join(
    parentDirectory,
    `.install-${process.pid}-${Date.now()}`,
  );
  const archivePath = path.join(temporaryDirectory, asset.archive);

  await mkdir(temporaryDirectory, { recursive: true });
  try {
    await download(`${RELEASE_BASE_URL}/${asset.archive}`, archivePath);
    await verifyChecksum(archivePath, asset.checksum);
    await extractArchive(asset, archivePath, temporaryDirectory);

    const temporaryBinary = path.join(
      temporaryDirectory,
      process.platform === "win32" ? "vale.exe" : "vale",
    );
    if (!(await fileExists(temporaryBinary))) {
      throw new Error(`Vale archive did not contain ${path.basename(binaryPath)}`);
    }
    if (process.platform !== "win32") {
      await chmod(temporaryBinary, 0o755);
    }

    await rm(archivePath);
    await rename(temporaryDirectory, installDirectory);
  } catch (error) {
    await rm(temporaryDirectory, { force: true, recursive: true });
    throw error;
  }
}

async function main() {
  const platformKey = `${process.platform}-${process.arch}`;
  const asset = assets.get(platformKey);
  if (!asset) {
    throw new Error(
      `Vale ${VALE_VERSION} is not configured for ${platformKey}`,
    );
  }

  const installDirectory = path.join(
    repositoryRoot,
    ".cache",
    "docs-tools",
    "vale",
    VALE_VERSION,
    platformKey,
  );
  const binaryPath = path.join(
    installDirectory,
    process.platform === "win32" ? "vale.exe" : "vale",
  );

  if (!(await fileExists(binaryPath))) {
    await mkdir(path.dirname(installDirectory), { recursive: true });
    await installVale(asset, installDirectory, binaryPath);
  }

  const targets =
    process.argv.length > 2
      ? process.argv.slice(2)
      : ["README.md", "AGENTS.md", "docs"];
  const code = await run(binaryPath, ["--no-global", ...targets]);
  process.exitCode = code;
}

await main();
