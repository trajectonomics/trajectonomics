// Icons of the planner pages, from Lucide (https://lucide.dev), licensed under the ISC licence,
// Copyright (c) Lucide Contributors. Each icon is its SVG elements, copied from the Lucide icon set.

import type { IconElement } from "./nav-icons"

/** The three icons of the planner pages, by name. */
export type PlanIconName = "landmark" | "trending-down" | "trending-up"

/** The elements of the planner pages' icons, copied from the Lucide icon set. */
export const PLAN_ICON_NODES: Readonly<Record<PlanIconName, readonly IconElement[]>> = {
	landmark: [
		["path", { d: "M10 18v-7" }],
		[
			"path",
			{
				d: "M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z",
			},
		],
		["path", { d: "M14 18v-7" }],
		["path", { d: "M18 18v-7" }],
		["path", { d: "M3 22h18" }],
		["path", { d: "M6 18v-7" }],
	],
	"trending-down": [
		["path", { d: "M16 17h6v-6" }],
		["path", { d: "m22 17-8.5-8.5-5 5L2 7" }],
	],
	"trending-up": [
		["path", { d: "M16 7h6v6" }],
		["path", { d: "m22 7-8.5 8.5-5-5L2 17" }],
	],
}
