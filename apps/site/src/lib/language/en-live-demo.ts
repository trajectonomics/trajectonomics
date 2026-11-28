/**
 * The hero's live window's words (ADR 0035), in English: the window's title bar, the zoom controls, the
 * facade's start label and the iframe's title. They live here rather than in `en-sections.ts` so that
 * file stays under the one-file line limit.
 */
export const ENGLISH_LIVE_DEMO = Object.freeze({
	liveDemoTitle: "traj Dashboard demo",
	liveDemoZoom: "Zoom",
	liveDemoZoomOut: "Zoom out",
	liveDemoZoomIn: "Zoom in",
	liveDemoZoomReset: "reset zoom",
	liveDemoStart: "Try the live Dashboard",
	liveDemoOpen: "Open full page",
	liveDemoFrameTitle: "The traj Dashboard demo",
})
