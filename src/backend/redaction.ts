import type { PrimitiveAttributeValue } from "./metric_model.ts";

export const DEFAULT_SENSITIVE_PATTERNS = [
  "authorization",
  "cookie",
  "set-cookie",
  "api_key",
  "api-key",
  "token",
  "password",
  "secret",
  "private_key",
  "session",
  "credential",
] as const;

const REDACTED_SENTINEL = "[REDACTED]";

export type RedactionOptions = {
  sensitivePatterns?: readonly string[];
  allowedKeys?: string[];
};

export type RedactionReport = {
  status: "passed" | "blocked";
  hiddenAttributeValues: number;
  patternsMatched: string[];
};

export function redactKeyValues(
  key: string,
  value: PrimitiveAttributeValue,
  options: RedactionOptions = {},
): PrimitiveAttributeValue {
  const patterns = options.sensitivePatterns ?? DEFAULT_SENSITIVE_PATTERNS;
  const allowedKeys = options.allowedKeys ?? [];

  if (allowedKeys.includes(key)) {
    return value;
  }

  const keyLower = key.toLowerCase();
  for (const pattern of patterns) {
    if (keyLower.includes(pattern)) {
      return REDACTED_SENTINEL;
    }
  }

  return value;
}

export function redactAttributes(
  attributes: Record<string, PrimitiveAttributeValue>,
  options: RedactionOptions = {},
): Record<string, PrimitiveAttributeValue> {
  const redacted: Record<string, PrimitiveAttributeValue> = {};

  for (const [key, value] of Object.entries(attributes)) {
    redacted[key] = redactKeyValues(key, value, options);
  }

  return redacted;
}

export function redactionReport(
  attributes: Record<string, PrimitiveAttributeValue>,
  options: RedactionOptions = {},
): RedactionReport {
  const patterns = options.sensitivePatterns ?? DEFAULT_SENSITIVE_PATTERNS;
  const allowedKeys = options.allowedKeys ?? [];
  let hiddenAttributeValues = 0;
  const patternsMatched: string[] = [];

  for (const [key, _value] of Object.entries(attributes)) {
    if (allowedKeys.includes(key)) {
      continue;
    }

    const keyLower = key.toLowerCase();
    for (const pattern of patterns) {
      if (keyLower.includes(pattern)) {
        hiddenAttributeValues += 1;
        if (!patternsMatched.includes(pattern)) {
          patternsMatched.push(pattern);
        }
        break;
      }
    }
  }

  return {
    status: hiddenAttributeValues > 0 ? "blocked" : "passed",
    hiddenAttributeValues,
    patternsMatched,
  };
}
