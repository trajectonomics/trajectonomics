import { describe, expect, test } from "bun:test"
import { experimental_AstroContainer as AstroContainer } from "astro/container"
import LanguageMenu from "./LanguageMenu.astro"
import SiteHeader from "./SiteHeader.astro"

/** The one container a test file renders through, created on the first render. */
let container: AstroContainer | undefined

/** One component rendered to the HTML string a page would carry. */
async function render(
	component: Parameters<AstroContainer["renderToString"]>[0],
	options: Parameters<AstroContainer["renderToString"]>[1] = {},
): Promise<string> {
	container ??= await AstroContainer.create()
	return container.renderToString(component, options)
}

/** The index of `part` in `html`, failing the test when the page does not carry it. */
function at(html: string, part: string): number {
	const index = html.indexOf(part)
	if (index < 0) throw new Error(`the rendered header has no ${part}`)
	return index
}

describe("SiteHeader", () => {
	test("draws the three columns in order under one named bar", async () => {
		const html = await render(SiteHeader, {
			props: { homeHref: "/", homeLabel: "trajectonomics" },
			slots: {
				nav: '<a class="ds-nav-link" href="/data/">Overview</a>',
				end: '<span data-tools="">tools</span>',
			},
		})

		expect(html).toContain('<header class="ds-header"')
		expect(html).toContain('<nav class="ds-header-inner" aria-label="Main"')
		expect(at(html, 'class="ds-header-start"')).toBeLessThan(at(html, 'class="ds-header-nav"'))
		expect(at(html, 'class="ds-header-nav"')).toBeLessThan(at(html, 'class="ds-header-end"'))
		// The centre and the end are exactly where their slots land.
		const nav = html.slice(at(html, 'class="ds-header-nav"'), at(html, 'class="ds-header-end"'))
		expect(nav).toContain('<a class="ds-nav-link" href="/data/">Overview</a>')
		expect(html.slice(at(html, 'class="ds-header-end"'))).toContain(
			'<span data-tools="">tools</span>',
		)
	})

	test("puts the tile at the start, named by its link", async () => {
		const html = await render(SiteHeader, {
			props: { homeHref: "/", homeLabel: "trajectonomics" },
		})
		const start = html.slice(at(html, 'class="ds-header-start"'), at(html, 'class="ds-header-nav"'))
		expect(start).toContain('<a class="ds-brand" href="/" aria-label="trajectonomics"')
		expect(start).toContain('class="ds-brand-tile"')
		// The link names itself, so the artwork is hidden from assistive technology.
		expect(start).toContain('aria-hidden="true" focusable="false"')
		expect(start).not.toContain('class="ds-marker"')
	})

	test("draws the marker beside the tile and marks only its own page", async () => {
		const marker = { href: "/data/", label: "Data" }
		const current = await render(SiteHeader, {
			props: {
				homeHref: "/",
				homeLabel: "Trajectonomics home",
				marker: { ...marker, current: true },
			},
		})
		const start = current.slice(
			at(current, 'class="ds-header-start"'),
			at(current, 'class="ds-header-nav"'),
		)
		expect(start).toContain('class="ds-marker" href="/data/" aria-current="page"')
		expect(start).toMatch(/>\s*Data\s*<\/a>/)

		const elsewhere = await render(SiteHeader, {
			props: {
				homeHref: "/",
				homeLabel: "Trajectonomics home",
				marker: { ...marker, current: false },
			},
		})
		expect(elsewhere).toContain('class="ds-marker" href="/data/"')
		expect(elsewhere).not.toContain('aria-current="page"')
	})

	test("keeps a site's own classes on the header and names the bar it is given", async () => {
		const html = await render(SiteHeader, {
			props: {
				homeHref: "/",
				homeLabel: "trajectonomics",
				class: "site-header fixed inset-x-0 top-0",
				navLabel: "Primary",
			},
		})
		expect(html).toContain('<header class="ds-header site-header fixed inset-x-0 top-0"')
		expect(html).toContain('aria-label="Primary"')
	})
})

describe("LanguageMenu", () => {
	const choice = (language: string) => ({
		href: `/blog/${language === "en" ? "" : `${language}/`}`,
		lang: language,
		hreflang: language,
		label: language === "en" ? "English" : "ไทย",
		current: language === "en",
		ariaLabel: language === "en" ? "Language — English" : undefined,
	})

	test("renders one link per choice, the current one marked", async () => {
		const html = await render(LanguageMenu, {
			props: {
				summaryLabel: "Language",
				currentLabel: "EN",
				choices: [choice("en"), choice("th")],
			},
		})

		expect(html).toContain('<summary class="header-menu-summary ds-nav-link" aria-label="Language"')
		expect(html).toContain("<span>EN</span>")
		expect(html.match(/class="header-menu-link"/g) ?? []).toHaveLength(2)
		expect(html).toContain(
			'href="/blog/" lang="en" hreflang="en" aria-label="Language — English" aria-current="page"',
		)
		expect(html).toContain('href="/blog/th/" lang="th" hreflang="th"')
		expect(html.match(/aria-current="page"/g) ?? []).toHaveLength(1)
		expect(html).toContain("data-header-menu")
		expect(html).toContain("pointer: fine")
	})
})
