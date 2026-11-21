#!/usr/bin/env bun
// Rebuilds public/demo/snapshot.json from the fictional ledger, with the workspace's own traj binary.
import { writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { runDemo } from "./demo-run"
import { spawnCapture } from "./spawn"

const WEB_ROOT = fileURLToPath(new URL("..", import.meta.url))
const BINARY = fileURLToPath(new URL("../../cli/dist/traj", import.meta.url))
const DEMO_SNAPSHOT = fileURLToPath(new URL("../public/demo/snapshot.json", import.meta.url))

const run = await runDemo(BINARY)
if (!run.ok) {
	process.stderr.write(`The demo could not be built: ${run.message}\n`)
	process.exit(1)
}
await writeFile(DEMO_SNAPSHOT, run.text)
// Biome has the last word on the layout, so the committed file is the one the formatter accepts.
const format = await spawnCapture(
	[process.execPath, "x", "biome", "format", "--write", DEMO_SNAPSHOT],
	{
		cwd: WEB_ROOT,
	},
)
if (format.code !== 0) {
	process.stderr.write(format.stdout + format.stderr)
	process.exit(format.code)
}
process.stdout.write(
	`Wrote ${DEMO_SNAPSHOT} (${(await Bun.file(DEMO_SNAPSHOT).size).toString()} bytes).\n`,
)
