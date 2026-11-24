import type { AppError } from "../errors"
import type { ScenarioRow } from "./rows"
import type {
	DeleteOptions,
	ForkOptions,
	HouseholdOptions,
	HouseholdPlanner,
	HouseholdSet,
	MainSet,
	NewScenario,
	NotesSet,
	RenameOptions,
	ScenarioDeleted,
	ScenarioForked,
	ScenarioRenamed,
	ScenarioSaved,
	TaxOptions,
	TaxPlanner,
	TaxSet,
} from "./scenario-types"
import type { ListOptions, ScenarioSort, WriteOptions } from "./types"

/** The Scenario half of the store: every method returns its value or an `AppError`. */
export interface ScenarioStore {
	saveScenario(input: NewScenario, options?: WriteOptions): ScenarioSaved | AppError
	/** Copies a live Scenario by id; `transform` runs inside the same write (ADR-0019, ADR-0024). */
	forkScenario(id: string, name: string, options?: ForkOptions): ScenarioForked | AppError
	/**
	 * Replaces a live Scenario's household and its document in one write. `plan` reads the document
	 * inside that write and returns what to store; a refusal rolls the write back (cli ADR-0048).
	 */
	replaceHousehold(
		id: string,
		plan: HouseholdPlanner,
		options?: HouseholdOptions,
	): HouseholdSet | AppError
	/**
	 * Replaces a live Scenario's tax profile and its document in one write. `plan` reads the
	 * document and the stored profile inside that write and returns what to store; a refusal rolls
	 * the write back (cli ADR-0066).
	 */
	replaceTax(id: string, plan: TaxPlanner, options?: TaxOptions): TaxSet | AppError
	/**
	 * Renames a live Scenario in place: the id, the document and the content hash stay, the version
	 * and `updatedAt` move (cli ADR-0071). `expectedHash` is checked in the same write.
	 */
	renameScenario(id: string, name: string, options?: RenameOptions): ScenarioRenamed | AppError
	/** Sets a live Scenario's notes, or clears them with null; the content hash does not move. */
	setScenarioNotes(id: string, notes: string | null, options?: WriteOptions): NotesSet | AppError
	/** Marks a live Scenario as the main plan, moving the mark from another; null clears it. */
	setMainScenario(id: string | null, options?: WriteOptions): MainSet | AppError
	/** Tombstones a live Scenario; the main plan only under `force`, which clears the setting. */
	deleteScenario(id: string, options?: DeleteOptions): ScenarioDeleted | AppError
	/** The live Scenario this id or exact name names; an id is read first (ADR-0018). */
	getScenario(idOrName: string): ScenarioRow | null | AppError
	listScenarios(options: ListOptions<ScenarioSort>): ScenarioRow[] | AppError
}
