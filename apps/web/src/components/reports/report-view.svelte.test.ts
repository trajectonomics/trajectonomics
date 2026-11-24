import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { demoSnapshotText } from "../../../scripts/demo-snapshot"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { type Snapshot, snapshot as snapshotSchema } from "../../lib/contract"
import { reportSource } from "../../lib/view/reports/source"
import { reportTables } from "../../lib/view/reports/tables"
import ReportView from "./ReportView.svelte"

const DEMO: Snapshot = snapshotSchema.parse(JSON.parse(await demoSnapshotText()))
const PLAN = Object.keys(DEMO.reads.projections).find(
	(name) => DEMO.reads.projections[name]?.ok === true,
)
const RUN = (() => {
	const read = PLAN === undefined ? undefined : DEMO.reads.projections[PLAN]
	return read?.ok === true ? read.data : null
})()
if (PLAN === undefined || RUN === null) throw new Error("the Demo snapshot holds no projection")

const props = { snapshot: DEMO, plan: PLAN, terms: "both", lens: null, changes: null }
const view = (extra: object = {}) => render(ReportView, { props: { ...props, ...extra } }).body

// The address is shared by every test file in the process, so it is put back as it was.
afterAll(() => setTestUrl("http://127.0.0.1/"))

describe("the Reports view, rendered from the Demo snapshot", () => {
	beforeEach(() => setTestUrl("http://127.0.0.1/reports/?demo=1"))

	test("previews the first table with every field, and offers each download", () => {
		const body = view()
		const first = reportTables(RUN)[0]
		expect(body).toContain(first?.label ?? "no table")
		for (const column of first?.columns ?? []) expect(body).toContain(`>${column.key}</th>`)
		for (const label of ["Download CSV", "Download JSON", "Download everything", "Print"]) {
			expect(body).toContain(label)
		}
		expect(body).toContain(`${PLAN} · As of ${RUN.asOf} · Nominal and real, in As-of terms`)
		expect(body).not.toContain("What-if session")
	})

	test("a hidden field is left out of the preview", () => {
		const first = reportTables(RUN)[0]
		const hide = first?.columns[0]?.key ?? ""
		const body = view({ hidden: [hide] })
		expect(body).not.toContain(`>${hide}</th>`)
		expect(body).toContain(`>${first?.columns[1]?.key}</th>`)
		expect(body).not.toMatch(/<button[^>]* disabled=""[^>]*>Download CSV/)
	})

	test("with every field hidden the CSV button is off, and the JSON is not", () => {
		const keys = (reportTables(RUN)[0]?.columns ?? []).map((column) => column.key)
		const body = view({ hidden: keys })
		expect(body).toMatch(/<button[^>]* disabled=""[^>]*>Download CSV/)
		expect(body).not.toMatch(/<button[^>]* disabled=""[^>]*>Download JSON/)
	})

	test("says the figures are a What-if session's when the session is on the plan", () => {
		const lens = { plan: PLAN, run: RUN, fi: null, compare: null, chance: null }
		const body = view({ lens, changes: { sets: [], removals: [] } })
		expect(body).toContain(
			`${PLAN} · As of ${RUN.asOf} · Nominal and real, in As-of terms · What-if session`,
		)
		expect(reportSource(DEMO.reads, PLAN, lens)?.whatIf).toBe(true)
	})

	test("a failed read shows the CLI's message, no table, and still offers Download everything", () => {
		const error = {
			code: "no_such_plan",
			exitCode: 4,
			message: "No plan named base in the ledger.",
		}
		const failed: Snapshot = {
			...DEMO,
			reads: {
				...DEMO.reads,
				projections: {
					...DEMO.reads.projections,
					[PLAN]: { argv: ["projection"], ok: false, error },
				},
			},
		}
		const body = view({ snapshot: failed })
		expect(body).toContain("No plan named base in the ledger.")
		expect(body).not.toContain("holds no projection")
		expect(body).toContain("Download everything")
		expect(body).not.toContain("Download CSV")
		expect(body).not.toContain("Download JSON")
		expect(body).not.toContain("<table")
	})

	test("a plan the Snapshot has no read for says so", () => {
		const body = view({ plan: "no-such-plan" })
		expect(body).toContain("The Snapshot holds no projection for this plan.")
		expect(body).toContain("Download everything")
	})
})
