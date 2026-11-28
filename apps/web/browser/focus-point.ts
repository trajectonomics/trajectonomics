/**
 * The one focus point rule (#707): a route with a `[data-focus-section]` draws exactly one element of text above
 * 28px, inside the focus point's visual; a route still waiting for its focus point may draw at most one. At most
 * one control is a primary action. The viewer is a person's words, and an empty list means the page passes.
 * Evaluated in the page, so it can only use the document.
 */
export function focusPointProblems(): string[] {
	const main = document.querySelector("main")
	if (main === null) return ["there is no main"]
	const problems: string[] = []
	const visual = main.querySelector("[data-focus-visual]")
	const focused = main.querySelector("[data-focus-section]") !== null
	const transparent = "rgba(0, 0, 0, 0)"

	/** The text an element draws itself, trimmed, or "" when it draws none. */
	const ownText = (element: Element): string =>
		[...element.childNodes]
			.filter((node) => node.nodeType === Node.TEXT_NODE)
			.map((node) => node.textContent ?? "")
			.join("")
			.trim()

	const sizeOf = (element: Element): number => Number.parseFloat(getComputedStyle(element).fontSize)

	/** Whether a person sees the element at all: laid out, drawn, and bigger than the screen-reader 1px box. */
	const drawn = (element: Element): boolean => {
		const shown = getComputedStyle(element)
		const box = element.getBoundingClientRect()
		return (
			shown.display !== "none" &&
			shown.visibility !== "hidden" &&
			Number.parseFloat(shown.opacity) > 0 &&
			box.width > 1 &&
			box.height > 1
		)
	}

	const large = [...main.querySelectorAll("*")]
		.filter((element) => ownText(element) !== "" && drawn(element) && sizeOf(element) > 28)
		.map(
			(element) =>
				`${Math.round(sizeOf(element))}px ${visual?.contains(element) ? "inside" : "outside"} the visual: ${ownText(element)}`,
		)
	if (focused) {
		if (large.length !== 1) {
			problems.push(
				`${large.length} elements draw text above 28px (one expected): ${large.join("; ")}`,
			)
		} else if (large[0]?.includes("outside the visual")) {
			problems.push(`the largest text is outside [data-focus-visual]: ${large[0]}`)
		}
	} else if (large.length > 1) {
		problems.push(
			`${large.length} elements draw text above 28px and this route has no focus point (at most one expected): ${large.join("; ")}`,
		)
	}

	/** The first opaque background behind an element: what its own fill would have to differ from. */
	const backdrop = (element: Element): string => {
		let at = element.parentElement
		while (at !== null && getComputedStyle(at).backgroundColor === transparent) {
			at = at.parentElement
		}
		return at === null
			? getComputedStyle(document.body).backgroundColor
			: getComputedStyle(at).backgroundColor
	}

	/** Whether a control is a primary action: it says so, or it paints a filled box of its own. */
	const primary = (element: Element): boolean => {
		if (element.hasAttribute("data-primary-action")) return true
		const own = drawn(element) ? getComputedStyle(element).backgroundColor : transparent
		if (own === transparent) return false
		return own === getComputedStyle(main as Element).color || own !== backdrop(element)
	}

	const actions = [...main.querySelectorAll("a, button")].filter(primary).map(ownText)
	if (actions.length > 1) {
		problems.push(`${actions.length} primary actions (at most one expected): ${actions.join("; ")}`)
	}
	return problems
}
