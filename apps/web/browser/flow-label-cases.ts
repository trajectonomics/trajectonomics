/** A Cash flow diagram's label that is wider than its room: 24 Japanese characters. */
export const JAPANESE = "家賃と生活費と教育費と医療費と交際費の合計額です"
/** 24 Japanese characters whose `ー` and `・` are Script=Common, so only Script_Extensions counts them wide. */
export const JAPANESE_PUNCTUATION = "コーヒーメーカーのサービス・カードローン返済用"
/** 36 Cyrillic capitals, which the estimate must not draw narrower than the page's font draws them. */
export const CYRILLIC = "ЖИЛИЩНЫЕ ШКОЛЬНЫЕ ЩЕДРЫЕ ШТРАФЫ"
/** Thirty months of the enclosed CJK block, U+3200–33FF, at a full em each. */
export const ENCLOSED = "㈱".repeat(30)
/** 80 wide Latin capitals, one word, which only a conservative width can fit. */
export const WIDE = "W".repeat(80)
/** Ten family emoji in one sequence: each is a grapheme the fitters must never split. */
export const FAMILY = "👨‍👩‍👧‍👦".repeat(10)
/** A plain label that fits every layout whole. */
export const PLAIN = "Drawn from Bank"
/** Capitals that fit on `main` at 360px and 1280px, and must still be whole. */
export const SUBSCRIPTIONS = "SUBSCRIPTIONS"
export const NETFLIX = "NETFLIX AND HBO"
/** Capitals that fit on `main` at 360px only: 1280px cuts them on `main` too. */
export const HOME_LOAN = "HOME LOAN AND CONDO FEES"
/** Two income Flows that share a label, with long ids that differ only near their end. */
export const INCOME_IDS = [
	"income-from-the-old-consulting-contract",
	"income-from-the-overseas-rental-flat",
] as const
/** Two saving Flows that share a label, with ids whose tails tell them apart. */
export const SAVING_IDS = ["saving-from-the-bank", "saving-from-the-vault"] as const
/** Two withdrawal Flows that share a label, with ids whose tails tell them apart. */
export const WITHDRAWAL_IDS = ["withdraw-from-the-pension", "withdraw-from-the-trust"] as const
