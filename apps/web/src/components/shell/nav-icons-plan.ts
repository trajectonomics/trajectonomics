// Icons of the planner pages, from Lucide (https://lucide.dev), licensed under the ISC licence,
// Copyright (c) Lucide Contributors. Each icon is its SVG elements, copied from the Lucide icon set.

import type { IconElement } from "./nav-icons"

/** The icons of the planner pages, by name. The Cash flow page is a planner page (#190). */
export type PlanIconName =
	| "file-text"
	| "landmark"
	| "milestone"
	| "trending-down"
	| "trending-up"
	| "workflow"

/** The elements of the planner pages' icons, copied from the Lucide icon set. */
export const PLAN_ICON_NODES: Readonly<Record<PlanIconName, readonly IconElement[]>> = {
	// Lucide "workflow" (ISC), copied from lucide-static 0.460.0.
	workflow: [
		["rect", { width: "8", height: "8", x: "3", y: "3", rx: "2" }],
		["path", { d: "M7 11v4a2 2 0 0 0 2 2h4" }],
		["rect", { width: "8", height: "8", x: "13", y: "13", rx: "2" }],
	],
	// Lucide "file-text" (ISC), copied from lucide-static 0.460.0.
	"file-text": [
		["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
		["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
		["path", { d: "M10 9H8" }],
		["path", { d: "M16 13H8" }],
		["path", { d: "M16 17H8" }],
	],
	milestone: [
		["path", { d: "M12 13v8" }],
		["path", { d: "M12 3v3" }],
		[
			"path",
			{
				d: "M18.172 6a2 2 0 0 1 1.414.586l2.06 2.06a1.207 1.207 0 0 1 0 1.708l-2.06 2.06a2 2 0 0 1-1.414.586H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z",
			},
		],
	],
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
