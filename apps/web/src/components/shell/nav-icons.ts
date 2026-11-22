// Icons from Lucide (https://lucide.dev), licensed under the ISC licence. Each icon is its SVG elements,
// copied from the Lucide icon set. The Dashboard draws them as SVG elements, never as HTML.

import type { IconName } from "../../lib/view/routes"

/** One element of an icon: its SVG tag and the attributes it is drawn with. */
export type IconElement = readonly [tag: string, attrs: Readonly<Record<string, string>>]

/** The elements of each icon the navigation draws, by name. */
export const ICON_NODES: Readonly<Record<IconName, readonly IconElement[]>> = {
	activity: [
		[
			"path",
			{
				d: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",
			},
		],
	],
	"book-open": [
		["path", { d: "M12 5v16" }],
		[
			"path",
			{
				d: "M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z",
			},
		],
	],
	calendar: [
		["path", { d: "M8 2v3" }],
		["path", { d: "M16 2v3" }],
		["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }],
		["path", { d: "M3 9h18" }],
	],
	"chart-line": [
		["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }],
		["path", { d: "m19 9-5 5-4-4-3 3" }],
	],
	"git-compare": [
		["circle", { cx: "18", cy: "18", r: "3" }],
		["circle", { cx: "6", cy: "6", r: "3" }],
		["path", { d: "M13 6h3a2 2 0 0 1 2 2v7" }],
		["path", { d: "M11 18H8a2 2 0 0 1-2-2V9" }],
	],
	house: [
		["path", { d: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" }],
		[
			"path",
			{
				d: "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
			},
		],
	],
	menu: [
		["path", { d: "M4 5h16" }],
		["path", { d: "M4 12h16" }],
		["path", { d: "M4 19h16" }],
	],
	receipt: [
		["path", { d: "M12 17V7" }],
		["path", { d: "M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8" }],
		[
			"path",
			{
				d: "M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z",
			},
		],
	],
	"sliders-horizontal": [
		["path", { d: "M10 5H3" }],
		["path", { d: "M12 19H3" }],
		["path", { d: "M14 3v4" }],
		["path", { d: "M16 17v4" }],
		["path", { d: "M21 12h-9" }],
		["path", { d: "M21 19h-5" }],
		["path", { d: "M21 5h-7" }],
		["path", { d: "M8 10v4" }],
		["path", { d: "M8 12H3" }],
	],
	wallet: [
		[
			"path",
			{
				d: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",
			},
		],
		["path", { d: "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" }],
	],
	x: [
		["path", { d: "M18 6 6 18" }],
		["path", { d: "m6 6 12 12" }],
	],
}
