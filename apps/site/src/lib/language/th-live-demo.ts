/**
 * The hero's live window's words (ADR 0035), in Thai: the window's title bar, the zoom controls and
 * the iframe's title. They live here rather than in `th-sections.ts` so that file stays under the
 * one-file line limit.
 */
export const THAI_LIVE_DEMO = Object.freeze({
	liveDemoTitle: "เดโมแดชบอร์ด traj",
	liveDemoZoom: "ซูม",
	liveDemoZoomOut: "ซูมออก",
	liveDemoZoomIn: "ซูมเข้า",
	liveDemoZoomReset: "รีเซ็ตการซูม",
	liveDemoOpen: "เปิดเต็มหน้า",
	liveDemoFrameTitle: "เดโมแดชบอร์ด traj",
})
