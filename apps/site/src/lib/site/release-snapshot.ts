import type { Language } from "../language/language"
import { type ReleaseFacts, type ReleaseSnapshot, releaseFacts } from "./release"
import raw from "./release.json" with { type: "json" }
import { releaseError } from "./release-error"

/** The committed snapshot `bun run release:update` writes: the release facts every page prints. */
export const RELEASE_SNAPSHOT: ReleaseSnapshot = Object.freeze({
	version: raw.version,
	releasedOn: raw.releasedOn,
	asOf: raw.asOf,
})

/** Every Language's twelve month words, January first, so a new Language adds one row and no page holds a copy. */
export const RELEASE_MONTHS: Readonly<Record<Language, readonly string[]>> = Object.freeze({
	en: Object.freeze([
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	]),
	th: Object.freeze([
		"ม.ค.",
		"ก.พ.",
		"มี.ค.",
		"เม.ย.",
		"พ.ค.",
		"มิ.ย.",
		"ก.ค.",
		"ส.ค.",
		"ก.ย.",
		"ต.ค.",
		"พ.ย.",
		"ธ.ค.",
	]),
})

/** One Language's release strings, from the committed snapshot and that Language's date words. */
export function releaseFor(language: Language): ReleaseFacts {
	const months = RELEASE_MONTHS[language]
	if (months === undefined) {
		throw releaseError(
			"RELEASE_LANGUAGE_UNKNOWN",
			"language",
			`the Site has no release day words for ${language}.`,
		)
	}
	return releaseFacts(RELEASE_SNAPSHOT, months)
}
