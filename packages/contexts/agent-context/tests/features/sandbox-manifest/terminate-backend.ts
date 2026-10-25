import assert from "node:assert/strict";
import type { Pool } from "pg";
/** Real backend termination while checked out and idle between two owner awaits. */
export async function terminateOwnedCheckout(
  pool: Pool,
  control: Pool,
  action: (borrowed: Pool) => Promise<unknown>,
): Promise<void> {
  const ready = Promise.withResolvers<{ pid: number; ended: Promise<null> }>();
  const resume = Promise.withResolvers<null>();
  let held = false;
  const isolated = new Proxy(pool, {
    get(target, key) {
      if (key !== "connect") {
        return Reflect.get(target, key);
      }
      return async () => {
        const client = await target.connect();
        const pid = (await client.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]
          ?.pid;
        assert.equal(typeof pid, "number");
        if (pid === undefined) {
          throw new Error("TEST backend missing");
        }
        const ended = Promise.withResolvers<null>();
        client.once("end", () => {
          ended.resolve(null);
        });
        return new Proxy(client, {
          get(connection, property) {
            if (property === "query") {
              return async (text: string, values?: unknown[]) => {
                const result = await connection.query(text, values);
                if (!held && text.startsWith("BEGIN")) {
                  held = true;
                  ready.resolve({ pid, ended: ended.promise });
                  await resume.promise;
                }
                return result;
              };
            }
            const value = Reflect.get(connection, property);
            return typeof value === "function" ? value.bind(connection) : value;
          },
        });
      };
    },
  });
  const pending = action(isolated);
  try {
    const { pid, ended } = await ready.promise;
    assert.equal(
      (
        await control.query<{ terminated: boolean }>(
          "SELECT pg_terminate_backend($1) AS terminated",
          [pid],
        )
      ).rows[0]?.terminated,
      true,
    );
    await ended;
    resume.resolve(null);
    await assert.rejects(pending, { code: "UNAVAILABLE" });
    assert.equal(
      (await pool.query<{ alive: number }>("SELECT 1 AS alive")).rows[0]?.alive,
      1,
      "discarded connection must not poison the next borrower",
    );
  } finally {
    resume.resolve(null);
    await pending.catch(() => {});
  }
}
