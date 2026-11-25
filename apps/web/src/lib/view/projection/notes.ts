/**
 * The HTML id of one note in a result's NoteList. The Scenario name scopes it, so two results on
 * one page (the FI page lists every Scenario) never share an id.
 */
export function noteAnchor(scenario: string, index: number): string {
	return `note-${scenario.replace(/[^A-Za-z0-9_-]+/g, "-")}-${index}`
}
