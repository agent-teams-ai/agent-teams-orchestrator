import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Pool, type PoolConfig } from "pg";

const nativeClientEnds = new WeakMap<Pool, Set<Promise<void>>>();

function fixturePool(config: PoolConfig): Pool {
  const pool = new Pool(config);
  const pending = new Set<Promise<void>>();
  nativeClientEnds.set(pool, pending);
  pool.on("connect", (client) => {
    const ended = new Promise<void>((resolve) => {
      client.once("end", () => {
        pending.delete(ended);
        resolve();
      });
    });
    pending.add(ended);
  });
  return pool;
}

async function closeFixturePool(pool: Pool): Promise<void> {
  const pending = nativeClientEnds.get(pool);
  if (pending === undefined) {
    throw new Error("TEST cannot close an unowned PostgreSQL pool");
  }
  if (!pool.ended) {
    await pool.end();
  }
  // Pool.end() can settle before the removed clients' native sockets close.
  await Promise.all(pending);
}

export async function ownedPostgres() {
  const root = await mkdtemp(
    join(process.platform === "darwin" ? "/private/tmp" : tmpdir(), "TEST-co-pg-"),
  );
  const data = join(root, "data");
  const socket = join(root, "socket");
  await mkdir(socket, { mode: 0o700 });
  const bin = process.env.TEST_POSTGRES_BIN ?? "/opt/homebrew/bin";
  const control = (...args: string[]) =>
    execFileSync(join(bin, "pg_ctl"), ["-D", data, ...args], {
      encoding: "utf8",
      timeout: 60000,
      stdio: "pipe",
    });
  let started = false;
  try {
    execFileSync(
      join(bin, "initdb"),
      ["-D", data, "-A", "trust", "-U", "TEST_owner", "--no-locale", "--encoding=UTF8"],
      { encoding: "utf8", timeout: 60000, stdio: "pipe" },
    );
    control(
      "-l",
      join(root, "postgres.log"),
      "-o",
      `-k ${socket} -c listen_addresses='' -c fsync=on`,
      "-w",
      "start",
    );
    started = true;
    const owner = fixturePool({ host: socket, user: "TEST_owner", database: "postgres", max: 5 });
    await owner.query("CREATE ROLE test_runtime LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT");
    const runtime = fixturePool({ host: socket, user: "test_runtime", database: "postgres", max: 5 });
    return {
      root,
      owner,
      runtime,
      async restart() {
        await closeFixturePool(runtime);
        await closeFixturePool(owner);
        control("-l", join(root, "postgres.log"), "-m", "fast", "-w", "restart");
        return {
          owner: fixturePool({ host: socket, user: "TEST_owner", database: "postgres" }),
          runtime: fixturePool({ host: socket, user: "test_runtime", database: "postgres" }),
        };
      },
      async stop(pools: readonly Pool[]) {
        await Promise.all(pools.map(closeFixturePool));
        control("-m", "fast", "-w", "stop");
        started = false;
        await rm(root, { recursive: true, force: true });
      },
    };
  } catch (error) {
    if (started) {
      control("-m", "fast", "-w", "stop");
    }
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}
