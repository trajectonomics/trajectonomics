import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { z } from "zod"
import { ALLOWANCE_KEYS, INCOME_LABELS, type Persona, type PersonaFlow } from "./persona-types"

export type { Persona, PersonaAccount, PersonaFlow } from "./persona-types"

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const BAHT = z.number().int().nonnegative()

const flowSchema: z.ZodType<PersonaFlow> = z
	.object({
		id: z.string().min(1),
		kind: z.enum(["income", "expense", "contribution"]),
		earned: z.boolean().optional(),
		label: z.enum(INCOME_LABELS).optional(),
		monthlyBaht: BAHT,
		target: z.string().optional(),
		growth: z.enum(["inflation", "none"]),
	})
	.refine((flow) => (flow.kind === "income" ? flow.earned !== undefined : true), {
		message: "an income flow states whether it is earned",
	})
	.refine((flow) => (flow.kind === "contribution" ? flow.target !== undefined : true), {
		message: "a contribution flow names its target account",
	})

/** The shape a persona file must have. Private: callers use `checkPersona` and `loadPersonas`. */
const personaSchema: z.ZodType<Persona> = z.object({
	id: z.string().regex(/^[a-z0-9-]+$/),
	title: z.string().min(1),
	asOf: DATE,
	horizon: DATE,
	inflationBps: BAHT,
	conversation: z.string().min(1),
	accounts: z.array(
		z.object({
			id: z.string().min(1),
			name: z.string().min(1),
			kind: z.enum(["asset", "liability"]),
			rateBps: BAHT,
			openingBaht: BAHT,
		}),
	),
	flows: z.array(flowSchema),
	cashflow: z.object({
		surplusTo: z.string().min(1),
		withdrawFrom: z.array(z.string().min(1)),
	}),
	tax: z.object({
		filingStatus: z.enum(["single", "married_no_income_spouse"]),
		children: z.array(z.object({ birthYear: z.number().int().min(1900).max(2100) })),
		allowances: z.partialRecord(z.enum(ALLOWANCE_KEYS), BAHT),
	}),
	whatIf: z.object({
		description: z.string().min(1),
		flowId: z.string().min(1),
		monthlyBaht: BAHT,
	}),
})

/** Null when the raw value is a valid persona; otherwise the problems, in one line. */
export function checkPersona(raw: unknown): string | null {
	const parsed = personaSchema.safeParse(raw)
	if (parsed.success) return null
	return parsed.error.issues.map((issue) => issue.message).join("; ")
}

/** Every persona file in a directory, validated, in name order. Throws on the first bad file. */
export function loadPersonas(dir: string): Persona[] {
	return readdirSync(dir)
		.filter((name) => name.endsWith(".json"))
		.sort()
		.map((name) => {
			const raw: unknown = JSON.parse(readFileSync(join(dir, name), "utf8"))
			const parsed = personaSchema.safeParse(raw)
			if (!parsed.success) {
				throw new Error(`${name}: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`)
			}
			return parsed.data
		})
}

/** Amounts a persona states, as the number a reader would type (`60,000`), for the consistency test. */
export function statedAmounts(persona: Persona): number[] {
	const amounts = [
		...persona.accounts.map((account) => account.openingBaht),
		...persona.flows.map((flow) => flow.monthlyBaht),
		...Object.values(persona.tax.allowances).filter((value) => value !== undefined),
		persona.whatIf.monthlyBaht,
	]
	return amounts.filter((amount) => amount > 0)
}
