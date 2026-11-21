import { describe, expect, test } from "bun:test"
import { indexReference } from "../agent/index-reference"
import { SITE_ORIGIN } from "../site"
import type { BuiltFile } from "./built-files"
import { checkBuild } from "./index"

/** A built page around `content`, carrying the one Theme the Docs Portal ships. */
function page(
	path: string,
	content = '<!doctype html><html data-theme="dark"><title>A page</title></html>',
): BuiltFile {
	return { path, content }
}

/** The pointer line every page with a twin carries before its content. */
function pointer(twin: string): string {
	return `<p>For AI agents: <a href="${twin}">Markdown</a> · <a href="/llms.txt">Docs index</a></p>`
}

/** The alternate Markdown link in a page's head. */
function alternate(twin: string): string {
	return `<link rel="alternate" type="text/markdown" href="${twin}">`
}

const OPERATOR_TAB_PAGE = [
	'<html data-theme="dark"><head>',
	alternate("/cli.md"),
	"</head><body>",
	'<header id="nd-subnav">',
	'<a href="/" aria-label="Trajectonomics Docs"><svg aria-hidden="true"></svg></a>',
	'<a href="/cli/" aria-current="page">CLI &amp; Quickstart</a>',
	'<a href="/contribute/">Contribute</a>',
	"</header>",
	`<aside id="nd-sidebar">${pointer("/cli.md")}<a href="/cli/">Quickstart</a></aside>`,
	"<main><h1>CLI &amp; Quickstart</h1></main>",
	"</body></html>",
].join("")

const RELEASE_LINE = "Docs for traj 0.4.0"

const LANDING_PAGE = [
	'<html data-theme="dark"><head>',
	alternate("/index.md"),
	"</head><body>",
	'<header id="nd-nav"><a href="/" aria-label="Trajectonomics Docs"><svg></svg></a>',
	'<a href="/llms.txt">Docs index</a></header>',
	"<main>",
	'<a href="/cli/">For Operators: install and run the CLI</a>',
	'<a href="/contribute/">For Contributors: help make the tax rules right</a>',
	`<p>${RELEASE_LINE}</p>`,
	"<h1>Trajectonomics Docs</h1>",
	"</main>",
	"</body></html>",
].join("")

const NOT_FOUND_PAGE = [
	'<html data-theme="dark">',
	'<header id="nd-nav">',
	'<a href="/" aria-label="Trajectonomics Docs"><svg></svg></a>',
	'<button data-search-full=""></button>',
	"</header>",
	'<div id="portal-not-found"><h1>Page not found</h1><a href="/">Docs Portal</a></div>',
	"</html>",
].join("")

/** A built redirect stub that sends the reader to `target`. */
function alias(path: string, target: string): BuiltFile {
	return {
		path,
		content: `<html><meta http-equiv="refresh" content="0;url=${target}"></html>`,
	}
}

const SITEMAP = [
	'<?xml version="1.0" encoding="UTF-8"?>',
	'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
	`  <url><loc>${SITE_ORIGIN}/</loc></url>`,
	`  <url><loc>${SITE_ORIGIN}/cli/</loc></url>`,
	`  <url><loc>${SITE_ORIGIN}/cli/commands/tx/</loc></url>`,
	"</urlset>",
].join("\n")

/** The Docs index the build publishes at `/llms.txt`. */
const DOCS_INDEX: BuiltFile = {
	path: "llms.txt",
	content: [
		"# Trajectonomics Docs",
		"",
		`- [Trajectonomics Docs](${SITE_ORIGIN}/index.md): Documentation for running the CLI.`,
		`- [CLI & Quickstart](${SITE_ORIGIN}/cli.md): Install traj.`,
		`- [tx](${SITE_ORIGIN}/cli/commands/tx.md): Manage ledger transactions.`,
		"",
	].join("\n"),
}

/** A Markdown twin that starts with its title and names the Docs index. */
function twin(path: string, title: string): BuiltFile {
	return {
		path,
		content: [`# ${title}`, "", "The page's words.", "", indexReference(SITE_ORIGIN), ""].join(
			"\n",
		),
	}
}

const COMPLETE_BUILD: readonly BuiltFile[] = [
	page("404.html", NOT_FOUND_PAGE),
	alias("operators/index.html", "/cli/"),
	alias("contributors/index.html", "/contribute/"),
	alias("builders/index.html", "/contribute/"),
	page("index.html", LANDING_PAGE),
	page("cli/index.html", OPERATOR_TAB_PAGE),
	page(
		"cli/commands/tx/index.html",
		[
			'<html data-theme="dark"><head>',
			alternate("/cli/commands/tx.md"),
			"</head><body>",
			'<header id="nd-subnav"><a href="/" aria-label="Trajectonomics Docs"><svg></svg></a></header>',
			pointer("/cli/commands/tx.md"),
			"<main><h1>tx</h1>",
			"<pre><code>date,from,to,amount,memo,external_ref,project</code></pre>",
			"</main>",
			"</body></html>",
		].join(""),
	),
	DOCS_INDEX,
	twin("index.md", "Trajectonomics Docs"),
	twin("cli.md", "CLI & Quickstart"),
	twin("cli/commands/tx.md", "tx"),
	{ path: "sitemap.xml", content: SITEMAP },
	{
		path: "api/search.json",
		content: JSON.stringify({
			type: "advanced",
			internalDocumentIDStore: {
				internalIdToId: ["/cli", "/cli/commands/tx"],
			},
			docs: {
				docs: {
					"1": { page_id: "/cli", type: "page" },
					"2": { page_id: "/cli/commands/tx", type: "page" },
				},
			},
		}),
	},
]

describe("the check of the built Docs Portal", () => {
	test("a complete build reports no failure", () => {
		expect(checkBuild(COMPLETE_BUILD, RELEASE_LINE)).toEqual([])
	})

	test("a build whose Installation page shows no copyable PATH line reports that rule", () => {
		const withoutLine = page(
			"cli/installation/index.html",
			'<html data-theme="dark"><main><p>Add ~/.local/bin to your PATH.</p></main></html>',
		)
		const codes = checkBuild([...COMPLETE_BUILD, withoutLine], RELEASE_LINE).map(
			(failure) => failure.code,
		)

		expect(codes).toContain("INSTALLATION_PAGE_PATH_LINE_MISSING")
	})

	test("a build that breaks several rules reports every failed rule, not only the first", () => {
		const stale: BuiltFile = { path: "_redirects", content: "/docs /cli/ 302\n" }

		expect(checkBuild([stale], RELEASE_LINE).map((failure) => failure.code)).toEqual([
			"NOT_FOUND_PAGE_MISSING",
			"LANDING_PAGE_MISSING",
			"OPERATOR_TAB_PAGE_MISSING",
			"SEARCH_INDEX_MISSING",
			"SITEMAP_MISSING",
			"DOCS_INDEX_MISSING",
			"REDIRECT_TO_OPERATOR_TAB",
			"TAB_ALIAS_MISSING",
			"TAB_ALIAS_MISSING",
			"TAB_ALIAS_MISSING",
			"IMPORT_TEMPLATE_NOT_SHOWN",
		])
	})
})
