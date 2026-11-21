import { type DesignTokens, parseDesignTokens } from "../../src/lib/design/tokens"

/** The published package the Site pins, whose CSS the built Site is judged against. */
const THEME_PACKAGE = "@trajectonomics/design-system-theme"

/** The Prebuilt Theme CSS files the package exports, one per published Theme. */
const THEME_SHEETS = ["themes/light.css", "themes/dark.css"]

/** The Tailwind Theme Stylesheet, which turns the Semantic Token Roles into utility colours. */
const TAILWIND_SHEET = "tailwind.css"

async function readPublished(subpath: string): Promise<string> {
	const file = Bun.resolveSync(`${THEME_PACKAGE}/${subpath}`, import.meta.dir)
	return Bun.file(file).text()
}

/** The Web Consumer Contract as the pinned package publishes it, the reference the Site is judged against. */
export async function readDesignTokens(): Promise<DesignTokens> {
	const themes = await Promise.all(THEME_SHEETS.map((sheet) => readPublished(sheet)))
	return parseDesignTokens({ themes, tailwind: await readPublished(TAILWIND_SHEET) })
}
