/**
 * Watches the page's sections and reports the one at the top of the viewport. This is the only
 * module that touches `IntersectionObserver` and `document`; `src/lib` stays pure.
 */
export function watchSections(ids: readonly string[], onChange: (id: string) => void): () => void {
	if (typeof IntersectionObserver === "undefined") return () => {}
	const elements = ids
		.map((id) => document.getElementById(id))
		.filter((element): element is HTMLElement => element !== null)
	if (elements.length === 0) return () => {}
	let current = elements[0]?.id ?? ""
	const observer = new IntersectionObserver(
		(entries) => {
			const visible = entries
				.filter((entry) => entry.isIntersecting)
				.sort(
					(left, right) =>
						Math.abs(left.boundingClientRect.top - 96) -
						Math.abs(right.boundingClientRect.top - 96),
				)
			const next = visible[0]?.target.id
			if (next !== undefined && next !== current) {
				current = next
				onChange(next)
			}
		},
		{ rootMargin: "-96px 0px -55% 0px", threshold: 0 },
	)
	for (const element of elements) observer.observe(element)
	return () => observer.disconnect()
}
