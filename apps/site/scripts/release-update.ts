import { join } from "node:path"
import { snapshotFor } from "../src/lib/site/release-feed"
import { readReleaseFeed, today } from "./adapters/release"

/** The committed snapshot the build reads, relative to this script. */
const SNAPSHOT = join(import.meta.dir, "..", "src", "lib", "site", "release.json")

const write = snapshotFor(await readReleaseFeed(), today())
if ("waiting" in write) {
	console.error(`release:update: ${write.waiting}`)
	process.exit(1)
}
const { version, releasedOn, asOf } = write.written
await Bun.write(SNAPSHOT, `${JSON.stringify(write.written, null, "\t")}\n`)
console.log(`release:update: wrote ${version}, released ${releasedOn}, read ${asOf}`)
