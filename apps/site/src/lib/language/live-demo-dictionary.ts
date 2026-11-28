/**
 * The live Demo section's keys of the Dictionary (ADR 0034): the label above its heading, the `h2`,
 * the one line under it, the window's title, the zoom group's name and each control's, the way out's
 * label, and the iframe's title. They live in their own interface so `dictionary.ts` stays under the
 * one-file line limit; `Dictionary` extends this one, so every Language still carries the same keys.
 */
export interface LiveDemoWords {
	readonly liveDemoEyebrow: string
	readonly liveDemoHeading: string
	readonly liveDemoLead: string
	readonly liveDemoTitle: string
	readonly liveDemoZoom: string
	readonly liveDemoZoomOut: string
	readonly liveDemoZoomIn: string
	readonly liveDemoZoomReset: string
	readonly liveDemoOpen: string
	readonly liveDemoFrameTitle: string
}
