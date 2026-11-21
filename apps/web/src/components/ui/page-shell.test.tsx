import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

import { PageShellView } from "./PageShell"

describe("PageShellView", () => {
	const shell = { title: "Net worth", intro: "What is here." }

	test("shows the loading state while the Snapshot is read", () => {
		const html = renderToStaticMarkup(
			<PageShellView
				{...shell}
				state={{ status: "loading" }}
				pathname="/net-worth/"
				render={() => <p>body</p>}
			/>,
		)
		expect(html).toContain("Loading the Snapshot.")
		expect(html).not.toContain("body")
	})

	test("shows the exact command and a demo link when no Snapshot is there", () => {
		const html = renderToStaticMarkup(
			<PageShellView
				{...shell}
				state={{ status: "missing", url: "/snapshot.json" }}
				pathname="/net-worth/"
				render={() => <p>body</p>}
			/>,
		)
		expect(html).toContain("bun run dashboard -- --as-of YYYY-MM-DD --horizon YYYY-MM-DD")
		expect(html).toContain('href="/net-worth/?demo=1"')
		expect(html).toContain("View the demo")
	})

	test("says why a file is not a Snapshot, and lists the first problems", () => {
		const html = renderToStaticMarkup(
			<PageShellView
				{...shell}
				state={{
					status: "invalid",
					url: "/snapshot.json",
					reason: "is Snapshot version 2; this Dashboard reads version 1",
					details: [],
				}}
				pathname="/net-worth/"
				render={() => <p>body</p>}
			/>,
		)
		expect(html).toContain("The Snapshot at /snapshot.json is Snapshot version 2")
		expect(html).toContain('role="alert"')
	})

	test("renders the body with the ready Snapshot", () => {
		const html = renderToStaticMarkup(
			<PageShellView
				{...shell}
				state={{ status: "ready", url: "/snapshot.json", snapshot: {} as never }}
				pathname="/net-worth/"
				render={() => <p>body</p>}
			/>,
		)
		expect(html).toContain("<p>body</p>")
		expect(html).toContain("<h1")
	})
})
