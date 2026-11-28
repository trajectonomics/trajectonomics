/**
 * The live Demo section's words (ADR 0034), in English: the label above its heading, the heading,
 * the one line under it, the window's title bar, the zoom controls and the iframe's title. They live
 * here rather than in `en-sections.ts` so that file stays under the one-file line limit.
 */
export const ENGLISH_LIVE_DEMO = Object.freeze({
	liveDemoEyebrow: "Live demo",
	liveDemoHeading: "Try the Dashboard right here",
	liveDemoLead:
		"The real Dashboard, reading a sample ledger. Click through it; it is read-only. Zoom out to see more on a small screen.",
	liveDemoTitle: "traj Dashboard demo",
	liveDemoZoom: "Zoom",
	liveDemoZoomOut: "Zoom out",
	liveDemoZoomIn: "Zoom in",
	liveDemoZoomReset: "reset zoom",
	liveDemoOpen: "Open full page",
	liveDemoFrameTitle: "The traj Dashboard demo",
})
