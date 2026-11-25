#!/usr/bin/env bun
// Prints a fingerprint of a Pack that two builds of the same sources share: `bun scripts/pack-fingerprint.ts pack/dashboard.bin`.
// SvelteKit stamps every build with the time it ran (`version.json`, and the pages that name it), so two builds of one
// commit never have the same `sha256` as files. The fingerprint hashes every file by its path with that stamp replaced, so
// it changes when, and only when, what a build wrote changed. Web ADR 0028 uses it to show the hosted target leaves the
// loopback build as it was.
import { createHash } from "node:crypto"
import { decodePack } from "./pack-format"

const STAMPED = /\.(html|json|js)$/
const decoder = new TextDecoder()

/** The sha256 of every file of the Pack, in path order, with the build's time stamp replaced. Null when the text is not a Pack. */
export function fingerprint(packText: string): string | null {
	const pack = decodePack(packText)
	const version = pack?.get("/_app/version.json")
	if (pack === null || version === undefined) return null
	const stamp = (JSON.parse(decoder.decode(version)) as { version: string }).version
	const hash = createHash("sha256")
	for (const path of [...pack.keys()].sort()) {
		let bytes: Uint8Array = pack.get(path) ?? new Uint8Array()
		if (STAMPED.test(path) && !path.startsWith("/demo/")) {
			const text = decoder
				.decode(bytes)
				.replaceAll(stamp, "<stamp>")
				.replace(/__sveltekit_[a-z0-9]+/g, "__sveltekit_<stamp>")
			bytes = new TextEncoder().encode(text)
		}
		hash.update(`${path}\0`).update(bytes).update("\0")
	}
	return hash.digest("hex")
}

if (import.meta.main) {
	const file = process.argv[2]
	const print = file === undefined ? null : fingerprint(await Bun.file(file).text())
	if (print === null) {
		process.stderr.write("Usage: bun scripts/pack-fingerprint.ts pack/dashboard.bin\n")
		process.exit(1)
	}
	process.stdout.write(`${print}\n`)
}
