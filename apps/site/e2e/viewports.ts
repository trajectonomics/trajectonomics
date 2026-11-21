/** One viewport the browser checks judge, in CSS pixels. */
interface Viewport {
	readonly height: number
	readonly width: number
}

/**
 * The desktop and phone the hero, rim, visual and accessibility checks judge, in CSS pixels. The keys
 * are this module's own; a check that names a committed baseline maps them to the names it keeps
 * ([ADR 0021](../docs/adr/0021-the-browser-checks-judge-a-phone-and-the-demo-output-wraps.md)).
 */
export const VIEWPORTS = {
	desktop: { width: 1280, height: 800 },
	phone: { width: 390, height: 844 },
} as const satisfies Record<string, Viewport>
