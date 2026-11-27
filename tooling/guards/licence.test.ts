import { describe, expect, it } from "bun:test"
import { join } from "node:path"
import { LICENCE, type Workspace, wrongLicences } from "./licence"

const ROOT = join(import.meta.dir, "..", "..")

/** The fields the guard reads from a `package.json`. */
interface PackageJson {
	readonly license?: string
	readonly workspaces?: readonly string[]
}

const root: PackageJson = await Bun.file(join(ROOT, "package.json")).json()
const workspaces: Workspace[] = await Promise.all(
	(root.workspaces ?? []).map(async (directory) => {
		const pkg: PackageJson = await Bun.file(join(ROOT, directory, "package.json")).json()
		return { directory, license: pkg.license }
	}),
)

describe("workspace licences", () => {
	it("names a workspace that declares another licence or none", () => {
		expect(
			wrongLicences([
				{ directory: "packages/a", license: LICENCE },
				{ directory: "packages/b", license: "Apache-2.0" },
				{ directory: "packages/c", license: undefined },
			]),
		).toEqual(["packages/b: Apache-2.0", "packages/c: no license field"])
	})

	it("gives every workspace package the repository licence", () => {
		expect(wrongLicences(workspaces)).toEqual([])
	})
})
