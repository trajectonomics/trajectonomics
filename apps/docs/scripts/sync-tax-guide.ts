import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { renderTaxGuidePage, TAX_GUIDE_PAGE, TAX_GUIDE_SOURCE } from "../src/lib/tax-guide"

// Run from apps/docs: the guide lives two levels up in the monorepo, under packages/core/tax.
const REPO_ROOT = join(import.meta.dir, "../../..")

/** Write the generated tax guide page from its source, and report the paths it used. */
export function main(): number {
	const guide = readFileSync(join(REPO_ROOT, TAX_GUIDE_SOURCE), "utf8")
	writeFileSync(TAX_GUIDE_PAGE, renderTaxGuidePage(guide))
	console.log(`sync:tax-guide: wrote ${TAX_GUIDE_PAGE} from ${TAX_GUIDE_SOURCE}`)
	return 0
}

if (import.meta.main) {
	process.exitCode = main()
}
