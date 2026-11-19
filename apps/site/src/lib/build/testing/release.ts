import type { Language } from "../../language/language"
import { languageEntry } from "../../language/languages"
import { RELEASE_SNAPSHOT } from "../../site/release-snapshot"

/** The footer's release line and its `<time>`, as the build writes them for one Language. */
export function releaseStrip(language: Language): string {
	const dictionary = languageEntry(language).dictionary
	return `<p>${dictionary.releaseLine}<span aria-hidden="true"> · </span><time datetime="${RELEASE_SNAPSHOT.releasedOn}">${dictionary.releaseDate}</time></p>`
}
