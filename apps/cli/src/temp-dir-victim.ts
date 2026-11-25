import { makeTempDir, sweepOnKill } from "./temp-dir"

// Run by `temp-dir.test.ts`: makes one directory, prints it, and waits to be killed.
sweepOnKill()
console.log(makeTempDir("traj-victim-"))
await Bun.sleep(60_000)
