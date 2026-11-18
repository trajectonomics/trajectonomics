import type { Dictionary } from "../../language/dictionary"

/** The three plain facts as the build must produce them: one definition list in the footer. */
export function factsStrip(dictionary: Dictionary): string {
	const facts = dictionary.factLabels
		.map(
			(label, index) =>
				`<div data-fact><dt>${label}</dt><dd>${dictionary.factTexts[index] ?? ""}</dd></div>`,
		)
		.join("\n")
	return `<dl data-facts>${facts}</dl>`
}
