import type { CSSProperties } from "react"

/** The step of a staggered group an element takes, which `motion.css` turns into a delay. */
function order(step: number): CSSProperties {
	return { "--landing-order": step } as CSSProperties
}

/** Attributes that make an element rise into place once, at `step` of its group (motion.css). */
export function rise(step: number) {
	return { "data-landing-rise": "", style: order(step) } as const
}

/** Attributes that fade an element in once, at `step` of its group (motion.css). */
export function fade(step: number) {
	return { "data-landing-fade": "", style: order(step) } as const
}
