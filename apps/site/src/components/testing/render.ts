import { experimental_AstroContainer as AstroContainer } from "astro/container"
import type { AstroComponentFactory } from "astro/runtime/server/index.js"

/** The one container a test file renders through, created on the first render. */
let container: AstroContainer | undefined

/** Renders one component to its HTML string, so a test can assert on the markup it ships. */
export async function renderComponent(
	component: AstroComponentFactory,
	props: Record<string, unknown>,
): Promise<string> {
	container ??= await AstroContainer.create()
	return container.renderToString(component, { props })
}
