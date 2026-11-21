import type { ReleaseFeed } from "../../src/lib/site/release-feed"
import { latestVersion, releasedOn } from "../../src/lib/site/release-feed"

/** The npm registry document of the CLI, the package a visitor installs. */
const REGISTRY = "https://registry.npmjs.org/@trajectonomics%2Fcli"

/** This repository, whose `cli-v<version>` releases carry the day a CLI version was published. */
const CLI_REPO = "trajectonomics/trajectonomics"

/** The version a visitor installs today, read from npm's registry over HTTPS. */
async function readRegistry(): Promise<unknown> {
	const response = await fetch(REGISTRY, { headers: { accept: "application/json" } })
	if (!response.ok) {
		throw new Error(`the npm registry answered ${response.status} for ${REGISTRY}`)
	}
	return await response.json()
}

/** One tag's release as `gh api` returns it, or `undefined` when the repository has no such release. */
async function readRelease(tag: string): Promise<unknown> {
	const gh = Bun.spawn(["gh", "api", `repos/${CLI_REPO}/releases/tags/${tag}`], {
		stderr: "pipe",
	})
	const [body, complaint] = await Promise.all([
		new Response(gh.stdout).text(),
		new Response(gh.stderr).text(),
	])
	if ((await gh.exited) === 0) return JSON.parse(body)
	if (/not found|HTTP 404/i.test(complaint)) return undefined
	throw new Error(`gh api could not read ${CLI_REPO}'s ${tag} release: ${complaint.trim()}`)
}

/** Both release feeds: npm's `latest`, and the release day of the tag it names. */
export async function readReleaseFeed(): Promise<ReleaseFeed> {
	const latest = latestVersion(await readRegistry())
	const release = await readRelease(`cli-v${latest}`)
	return Object.freeze({
		latest,
		releasedOn: release === undefined ? undefined : releasedOn(release),
	})
}

/** The day this script ran, which is the date the snapshot records that it was read. */
export function today(): string {
	return new Date().toISOString().slice(0, 10)
}
