import { afterAll } from "bun:test"
import { sweepOnKill, sweepTempDirs } from "./temp-dir"

// Loaded by `bunfig.toml` before the tests. Bun runs this hook once, after the last file, whether
// the tests passed or failed; `sweepOnKill` covers a run that is interrupted or terminated.
afterAll(sweepTempDirs)
sweepOnKill()
