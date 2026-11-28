/**
 * The hero's live window's keys of the Dictionary (ADR 0035): the window's title, the zoom group's
 * name and each control's, the facade's start label, the way out's label, and the iframe's title. They
 * live in their own interface so `dictionary.ts` stays under the one-file line limit; `Dictionary`
 * extends this one, so every Language still carries the same keys.
 */
export interface LiveDemoWords {
	readonly liveDemoTitle: string
	readonly liveDemoZoom: string
	readonly liveDemoZoomOut: string
	readonly liveDemoZoomIn: string
	readonly liveDemoZoomReset: string
	readonly liveDemoStart: string
	readonly liveDemoOpen: string
	readonly liveDemoFrameTitle: string
}
