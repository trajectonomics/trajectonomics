import { afterAll, describe, expect, it } from "bun:test"
import { chmodSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { makeTempDir } from "./temp-dir"

// install.sh picks where to download from before it fetches anything. A stub curl records the
// first URL it is asked for and fails, so the script stops right after choosing.
const scratch = makeTempDir("traj-install-routing-")
const urls = join(scratch, "urls")
writeFileSync(
	join(scratch, "curl"),
	`#!/bin/sh\nfor a; do last=$a; done\necho "$last" >> "${urls}"\nexit 22\n`,
)
chmodSync(join(scratch, "curl"), 0o755)
const installer = join(import.meta.dir, "..", "install.sh")

afterAll(() => rmSync(scratch, { recursive: true, force: true }))

function firstUrl(env: Record<string, string>): string {
	writeFileSync(urls, "")
	Bun.spawnSync(["sh", installer], {
		env: {
			PATH: `${scratch}:${process.env["PATH"]}`,
			TRAJ_INSTALL_DIR: join(scratch, "bin"),
			...env,
		},
		stdout: "ignore",
		stderr: "ignore",
	})
	return readFileSync(urls, "utf8").split("\n")[0] ?? ""
}

describe("install.sh chooses where a release's assets live", () => {
	it("takes the latest release of this repository when no version is pinned", () => {
		expect(firstUrl({})).toStartWith(
			"https://github.com/trajectonomics/trajectonomics/releases/latest/download/",
		)
	})

	it("takes a pinned version from its cli-v release in this repository", () => {
		expect(firstUrl({ TRAJ_VERSION: "0.4.0" })).toStartWith(
			"https://github.com/trajectonomics/trajectonomics/releases/download/cli-v0.4.0/",
		)
	})

	it("takes 0.1.0 to 0.3.0 from trajectonomics/cli, where they were released", () => {
		for (const version of ["0.1.0", "0.2.0", "0.3.0"]) {
			expect(firstUrl({ TRAJ_VERSION: version })).toStartWith(
				`https://github.com/trajectonomics/cli/releases/download/v${version}/`,
			)
		}
	})

	it("keeps the new layout under a test base URL, even for an old version", () => {
		expect(
			firstUrl({ TRAJ_VERSION: "0.3.0", TRAJ_DOWNLOAD_BASE_URL: "https://example.test/rel" }),
		).toStartWith("https://example.test/rel/download/cli-v0.3.0/")
	})
})
