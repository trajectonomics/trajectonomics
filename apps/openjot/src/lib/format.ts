// Formatting and calculator helpers for the MooJot UI.

const EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const TH_DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."] as const;
const EN_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;
const TH_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
] as const;

/** Format an integer amount of satang as baht, e.g. 292250 -> "2,922.50". */
export function formatBaht(satang: number, showSymbol = false): string {
  const total = Math.abs(Math.round(satang));
  const baht = Math.floor(total / 100);
  const stang = total % 100;

  const grouped = String(baht).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = stang === 0 ? "" : `.${String(stang).padStart(2, "0")}`;
  const sign = satang < 0 ? "-" : "";
  const symbol = showSymbol ? " ฿" : "";

  return `${sign}${grouped}${fraction}${symbol}`;
}

type Operator = "+" | "-" | "*" | "/" | "%";
type NumberToken = { kind: "number"; value: number };
type OperatorToken = { kind: "operator"; value: Operator };
type Token = NumberToken | OperatorToken;

function isNumberToken(token: Token): token is NumberToken {
  return token.kind === "number";
}

function isOperatorToken(token: Token): token is OperatorToken {
  return token.kind === "operator";
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function tokenize(input: string): Token[] | null {
  const normalized = input.replace(/×/g, "*").replace(/÷/g, "/").replace(/,/g, "");
  const tokens: Token[] = [];
  let i = 0;

  while (i < normalized.length) {
    const ch = normalized[i]!;

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i += 1;
      continue;
    }

    if (isDigit(ch) || ch === ".") {
      let literal = "";
      let dots = 0;
      while (i < normalized.length) {
        const c = normalized[i]!;
        if (isDigit(c)) {
          literal += c;
          i += 1;
        } else if (c === ".") {
          dots += 1;
          if (dots > 1) return null;
          literal += c;
          i += 1;
        } else {
          break;
        }
      }
      const value = Number(literal);
      if (!Number.isFinite(value)) return null;
      tokens.push({ kind: "number", value });
      continue;
    }

    if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "%") {
      tokens.push({ kind: "operator", value: ch });
      i += 1;
      continue;
    }

    // Anything else (letters, parentheses, etc.) is not allowed.
    return null;
  }

  return tokens;
}

/**
 * Evaluate a simple arithmetic expression without eval().
 * Supports +, -, * (×), / (÷), % (remainder) and decimal numbers,
 * with standard operator precedence. Returns `null` for invalid input,
 * division by zero, or a non-finite result. The result is rounded to
 * two decimal places.
 */
export function evalCalcExpression(expr: string): number | null {
  const tokens = tokenize(expr);
  if (tokens === null || tokens.length === 0) return null;

  // Resolve unary + / - into signed numbers.
  const cleaned: Token[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]!;
    const previous = cleaned[cleaned.length - 1];
    const expectingNumber = previous === undefined || isOperatorToken(previous);

    if (expectingNumber && isOperatorToken(token)) {
      if (token.value !== "+" && token.value !== "-") return null;
      const next = tokens[i + 1];
      if (next === undefined || !isNumberToken(next)) return null;
      cleaned.push({
        kind: "number",
        value: token.value === "-" ? -next.value : next.value,
      });
      i += 1;
    } else {
      cleaned.push(token);
    }
  }

  // Require a strict number/operator/number/... alternation.
  for (let i = 0; i < cleaned.length; i += 1) {
    const mustBeNumber = i % 2 === 0;
    if (isNumberToken(cleaned[i]!) !== mustBeNumber) return null;
  }

  // First pass: multiplication, division and remainder -> terms.
  const terms: number[] = [(cleaned[0] as NumberToken).value];
  const addOperators: ("+" | "-")[] = [];

  for (let i = 1; i < cleaned.length; i += 2) {
    const operator = (cleaned[i] as OperatorToken).value;
    const right = (cleaned[i + 1] as NumberToken).value;

    if (operator === "*" || operator === "/" || operator === "%") {
      const left = terms[terms.length - 1]!;
      let result: number;
      if (operator === "*") {
        result = left * right;
      } else {
        if (right === 0) return null;
        result = operator === "/" ? left / right : left % right;
      }
      terms[terms.length - 1] = result;
    } else {
      addOperators.push(operator);
      terms.push(right);
    }
  }

  // Second pass: addition and subtraction, left to right.
  let result = terms[0]!;
  for (let i = 0; i < addOperators.length; i += 1) {
    const next = terms[i + 1]!;
    result = addOperators[i] === "+" ? result + next : result - next;
  }

  if (!Number.isFinite(result)) return null;
  return Math.round(result * 100) / 100;
}

/** Format a YYYY-MM-DD date as e.g. "Sat 21 Nov 26" (en) or "ส. 21 พ.ย. 69" (th). */
export function formatShortDate(ymd: string, lang: "en" | "th"): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (match === null) return ymd;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return ymd;

  const weekday = new Date(year, month - 1, day).getDay();
  const days = lang === "en" ? EN_DAYS : TH_DAYS;
  const months = lang === "en" ? EN_MONTHS : TH_MONTHS;
  const shortYear =
    lang === "en"
      ? String(year % 100).padStart(2, "0")
      : String((year + 543) % 100).padStart(2, "0");

  return `${days[weekday]} ${day} ${months[month - 1]} ${shortYear}`;
}

/** Return today's local date as YYYY-MM-DD. */
export function todayYmd(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
