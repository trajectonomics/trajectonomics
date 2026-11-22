import { afterAll } from "bun:test"
import { sweepTempDirs } from "./temp-dir"

// Loaded by `bunfig.toml` before the tests. Bun runs this hook once, after the last file, whether
// the tests passed or failed.
afterAll(sweepTempDirs)
