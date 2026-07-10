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

const DEFAULT_SENSITIVE_VALUE_PATTERNS = [
  { label: "authorization-value", pattern: /^\s*(?:bearer|basic)\s+\S+/i },
  { label: "access-token-value", pattern: /(?:^|[?&;\s])access[_-]?token\s*=\s*[^&;\s]+/i },
  { label: "token-value", pattern: /(?:^|[?&;\s])token\s*=\s*[^&;\s]+/i },
  { label: "api-key-value", pattern: /(?:^|[?&;\s])api[_-]?key\s*=\s*[^&;\s]+/i },
  { label: "password-value", pattern: /(?:^|[?&;\s])(?:password|passwd|pwd)\s*=\s*[^&;\s]+/i },
  { label: "secret-value", pattern: /(?:^|[?&;\s])secret\s*=\s*[^&;\s]+/i },
  { label: "credential-value", pattern: /(?:^|[?&;\s])credential\s*=\s*[^&;\s]+/i },
  { label: "session-value", pattern: /(?:^|[?&;\s])session(?:id|_id)?\s*=\s*[^&;\s]+/i },
  { label: "url-credentials", pattern: /^[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s@]+@/i },
  { label: "private-key-value", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i },
] as const;

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

  return sensitivePattern(key, value, patterns) === undefined ? value : REDACTED_SENTINEL;
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

  for (const [key, value] of Object.entries(attributes)) {
    if (allowedKeys.includes(key)) {
      continue;
    }

    const pattern = sensitivePattern(key, value, patterns);
    if (pattern !== undefined) {
      hiddenAttributeValues += 1;
      if (!patternsMatched.includes(pattern)) {
        patternsMatched.push(pattern);
      }
    }
  }

  return {
    status: hiddenAttributeValues > 0 ? "blocked" : "passed",
    hiddenAttributeValues,
    patternsMatched,
  };
}

function sensitivePattern(
  key: string,
  value: PrimitiveAttributeValue,
  keyPatterns: readonly string[],
): string | undefined {
  const keyLower = key.toLowerCase();
  for (const pattern of keyPatterns) {
    if (keyLower.includes(pattern)) {
      return pattern;
    }
  }

  if (typeof value !== "string") {
    return undefined;
  }
  return DEFAULT_SENSITIVE_VALUE_PATTERNS.find(({ pattern }) => pattern.test(value))?.label;
}
