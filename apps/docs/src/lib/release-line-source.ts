import { execFileSync } from "node:child_process"
import { newestCliVersion, releaseLine } from "./release-line"

/** Lists the cli release tags reachable from HEAD, one per line. Throws when there is no git. */
export type ListCliTags = () => string

/** The build's own git read: tags reachable from HEAD. A tarball or a shallow clone lists none. */
export function listReachableCliTags(): string {
	return execFileSync("git", ["tag", "--merged", "HEAD", "--list", "cli-v[0-9]*"], {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "ignore"],
	})
}

/**
 * The release line for this build, or `undefined` when the build has no git or no cli tag. The
 * build then omits the line; it never fails over it.
 */
export function readReleaseLine(listTags: ListCliTags = listReachableCliTags): string | undefined {
	let output: string
	try {
		output = listTags()
	} catch {
		return undefined
	}
	return releaseLine(newestCliVersion(output.split("\n")))
}
