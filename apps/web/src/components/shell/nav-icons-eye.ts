// `eye` and `eye-off` are from Lucide (https://lucide.dev), licensed under the ISC licence,
// Copyright (c) Lucide Contributors. Each is its SVG elements, copied from the Lucide icon set.
// The Dashboard draws them as SVG elements, never as HTML.

import type { IconElement } from "./nav-icons"

/** The eye icons the top bar's Hide amounts switch draws, by name. */
export const EYE_ICON_NODES: Readonly<Record<"eye" | "eye-off", readonly IconElement[]>> = {
	eye: [
		[
			"path",
			{
				d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
			},
		],
		["circle", { cx: "12", cy: "12", r: "3" }],
	],
	"eye-off": [
		[
			"path",
			{
				d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
			},
		],
		["path", { d: "M14.084 14.158a3 3 0 0 1-4.242-4.242" }],
		[
			"path",
			{
				d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
			},
		],
		["path", { d: "m2 2 20 20" }],
	],
}
