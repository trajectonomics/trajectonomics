// Argument parsing for version.ts: each flag's value is checked here, before any git or npm call.

import { type BumpRequest, type Channel, parseStable } from "./semver"

export function required(value: string | undefined, flag: string): string {
	if (value === undefined || value.trim() === "") throw new Error(`${flag} is required`)
	return value
}

export function parseChannel(value: string | undefined): Channel {
	if (value === "alpha" || value === "stable") return value
	throw new Error("--channel must be alpha or stable")
}

export function parseBump(value: string | undefined): BumpRequest {
	if (value === "auto" || value === "major" || value === "minor" || value === "patch") return value
	throw new Error("--bump must be auto, major, minor or patch")
}

export function parseExtraPaths(value: readonly string[] | undefined): string[] {
	return (value ?? []).map((path) => path.replace(/\/+$/, ""))
}

export function parseFirstVersion(value: string | undefined): string | null {
	if (value === undefined) return null
	if (parseStable(value) === null)
		throw new Error("--first-version must be a stable version, e.g. 0.3.0")
	return value
}
