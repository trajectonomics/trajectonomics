import { type RefObject, useEffect, useRef, useState } from "react"

/** The narrowest a chart is drawn, so its axis labels never collide. */
const MIN_WIDTH = 240

/**
 * The width of an element, kept current as it resizes. The fallback is used until the element is
 * measured, which is also what the server renders.
 */
export function useMeasuredWidth(fallback: number): [RefObject<HTMLDivElement | null>, number] {
	const ref = useRef<HTMLDivElement | null>(null)
	const [width, setWidth] = useState(fallback)
	useEffect(() => {
		const element = ref.current
		if (!element) return
		const measure = () => setWidth(Math.max(MIN_WIDTH, Math.floor(element.clientWidth)))
		measure()
		if (typeof ResizeObserver === "undefined") return
		const observer = new ResizeObserver(measure)
		observer.observe(element)
		return () => observer.disconnect()
	}, [])
	return [ref, width]
}
