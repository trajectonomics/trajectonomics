import { type PlanPrice, plan } from "./types"

const PRICING = "https://mistral.ai/pricing"

/** Mistral's Pro plan, the tier its history names. */
export const mistral: readonly PlanPrice[] = [plan("Pro", 14.99, PRICING, "$14.99 per month")]
