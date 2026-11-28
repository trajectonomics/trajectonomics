// A hint's command is pasted into a shell, so every argument is quoted (cli ADR-0048, ADR-0083).
import { describe, expect, it } from "bun:test"
import { chmodSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { projectionHome } from "./projection/testing"
import { SALARY, tax } from "./scenario-tax-profile-support"
import { makeTempDir } from "./temp-dir"
import { type Captured, capture } from "./test-support"

type AssumedItem = { kind: string; path: string; hint: string | null }

type Shown = { document: { flows: Record<string, unknown>[] }; assumed: AssumedItem[] }

/** The base plan, read with the name after `--` so a name that starts with `-` is a name. */
async function shownNamed(home: string, name: string): Promise<Shown> {
	const res = await capture(["scenario", "show", "--json", "--", name], { TRAJ_HOME: home })
	expect(res.code).toBe(0)
	return JSON.parse(res.out).scenario as Shown
}

/** `traj scenario apply <name> --file -`, with the name after `--`. */
function applyNamed(home: string, name: string, document: unknown): Promise<Captured> {
	return capture(
		["scenario", "apply", "--file", "-", "--json", "--", name],
		{ TRAJ_HOME: home },
		undefined,
		JSON.stringify(document),
	)
}

/** A taxed plan with one extra income Flow, `id`, that carries no tax label. */
async function taxedWith(home: string, id: string, name = "base"): Promise<void> {
	const paid =
		name === "base"
			? await tax(home, ["base", "--tax", "th-2026", ...SALARY])
			: await capture(
					[
						"scenario",
						"tax",
						"--tax",
						"th-2026",
						"--children",
						"1",
						"--label",
						"salary=income.section40_1",
						"--json",
						"--",
						name,
					],
					{ TRAJ_HOME: home },
				)
	expect(paid.code).toBe(0)
	const document = (await shownNamed(home, name)).document
	const salary = document.flows.find((flow) => flow["id"] === "salary") ?? {}
	const { label: _label, ...unlabelled } = salary
	expect(
		(
			await applyNamed(home, name, {
				...document,
				flows: [...document.flows, { ...unlabelled, id }],
			})
		).code,
	).toBe(0)
}

/** The command a hint prints, between the quotes its sentence wraps around it. */
function commandOf(hint: string | null | undefined): string {
	return hint?.match(/^Run "(traj .+)" for a salary/)?.[1] ?? ""
}

/** A directory holding a `traj` that runs this checkout's CLI, for `sh -c` to find. */
function trajShim(): string {
	const dir = makeTempDir("traj-hint-")
	const file = join(dir, "traj")
	const entry = join(import.meta.dir, "index.ts")
	writeFileSync(file, `#!/bin/sh\nexec '${process.execPath}' '${entry}' "$@"\n`)
	chmodSync(file, 0o755)
	return dir
}

/** Runs `command` in `sh`, with this checkout's `traj` on PATH and a scratch data directory. */
async function shell(command: string, home: string): Promise<Captured> {
	const proc = Bun.spawn(["sh", "-c", command], {
		env: {
			PATH: `${trajShim()}:${process.env["PATH"] ?? ""}`,
			TRAJ_HOME: home,
			DO_NOT_TRACK: "1",
		},
		stdout: "pipe",
		stderr: "pipe",
	})
	const [out, err, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	])
	return { code, out, err }
}

describe("the command an unlabelled-income hint prints", () => {
	it("quotes a Flow id with an apostrophe so the shell passes it whole", async () => {
		const home = await projectionHome()
		await taxedWith(home, "o'brien")
		const item = (await shownNamed(home, "base")).assumed.find(
			(entry) => entry.kind === "unlabelled-income",
		)
		expect(item?.hint).toContain("flows.o'\\''brien.label")
		const ran = await shell(commandOf(item?.hint), home)
		expect(ran.code).toBe(0)
		expect(ran.err).toBe("")
		expect(
			(await shownNamed(home, "base")).assumed.some((entry) => entry.kind === "unlabelled-income"),
		).toBe(false)
	})

	it("cannot be tricked into running a second command", async () => {
		const home = await projectionHome()
		await taxedWith(home, "x';echo INJECTED >&2;'")
		const item = (await shownNamed(home, "base")).assumed.find(
			(entry) => entry.kind === "unlabelled-income",
		)
		const ran = await shell(commandOf(item?.hint), home)
		expect(ran.code).toBe(0)
		expect(ran.err).not.toContain("INJECTED")
		expect(
			(await shownNamed(home, "base")).assumed.some((entry) => entry.kind === "unlabelled-income"),
		).toBe(false)
	})
})

describe("a plan name that starts with -", () => {
	it("goes after -- in every hint, and the unlabelled-income hint runs", async () => {
		const home = await projectionHome()
		const original = await shownNamed(home, "base")
		expect((await applyNamed(home, "-neg", original.document)).code).toBe(0)
		await taxedWith(home, "bonus", "-neg")
		const items = (await shownNamed(home, "-neg")).assumed
		const unlabelled = items.find((item) => item.kind === "unlabelled-income")
		expect(unlabelled?.hint).toContain('-- -neg"')
		expect(
			items.find((item) => item.path === "taxAllowances.retirementContributions")?.hint,
		).toContain("-- -neg")
		expect(items.find((item) => item.path === "taxAllowances.lifeInsurance")?.hint).toContain(
			"-- -neg",
		)
		const ran = await shell(commandOf(unlabelled?.hint), home)
		expect(ran.code).toBe(0)
		expect(
			(await shownNamed(home, "-neg")).assumed.some((entry) => entry.kind === "unlabelled-income"),
		).toBe(false)
	})
})
