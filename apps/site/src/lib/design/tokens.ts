/** One published Theme: its name, and the value each Semantic Token Role resolves to. */
export interface Theme {
	readonly name: string
	readonly colours: Readonly<Record<string, string>>
}

/** The Web Consumer Contract the Site may depend on, read from the published CSS (design-system ADR 0005). */
export interface DesignTokens {
	/** Every published Theme, in the order the CSS declares them. */
	readonly themes: readonly Theme[]
	/** The utility colour names the Tailwind Theme Stylesheet generates from the Semantic Token Roles. */
	readonly colourUtilities: readonly string[]
}

/** The published CSS a consumer reads the Contract from: one Prebuilt Theme CSS file per Theme, and the Tailwind Theme Stylesheet. */
export interface PublishedCss {
	readonly themes: readonly string[]
	readonly tailwind: string
}

const THEME_BLOCK = /\[data-theme=["']?([\w-]+)["']?\]\s*\{([^}]*)\}/g
const ROLE_DECLARATION = /--ds-color-([\w-]+)\s*:\s*([^;}]+)/g
const UTILITY_DECLARATION = /^--color-([\w-]+)$/

/** The declarations of one rule body, by custom property name, with the value as written. */
function declarations(body: string): ReadonlyMap<string, string> {
	const found = new Map<string, string>()
	for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
		const name = match[1]
		const value = match[2]?.trim()
		if (name !== undefined && value !== undefined) found.set(name, value)
	}
	return found
}

function themeOf(name: string, body: string): Theme {
	const colours: Record<string, string> = {}
	for (const role of body.matchAll(ROLE_DECLARATION)) {
		if (role[1] !== undefined && role[2] !== undefined) colours[role[1]] = role[2].trim()
	}
	return Object.freeze({ name, colours: Object.freeze(colours) })
}

function themesOf(css: readonly string[]): readonly Theme[] {
	return css.flatMap((sheet) =>
		[...sheet.matchAll(THEME_BLOCK)].flatMap((block) =>
			block[1] === undefined || block[2] === undefined ? [] : [themeOf(block[1], block[2])],
		),
	)
}

/** The Semantic Token Roles the published CSS defines, and the colour utilities it generates. */
export function parseDesignTokens(css: PublishedCss): DesignTokens {
	return Object.freeze({
		themes: Object.freeze(themesOf(css.themes)),
		colourUtilities: Object.freeze(
			[...declarations(css.tailwind).keys()].flatMap((name) => {
				const utility = UTILITY_DECLARATION.exec(name)
				return utility?.[1] === undefined ? [] : [utility[1]]
			}),
		),
	})
}
