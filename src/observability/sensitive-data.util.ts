export const REDACTED_VALUE = '[REDACTED]';
export const MASKED_CPF = '***.***.***-**';

const SENSITIVE_PASSWORD_KEY_REGEX =
  /^(?:.*[_-])?(?:password|passwd|senha|secret|authorization|cookie|token|api[_-]?key)(?:[_-].*)?$/i;

const SENSITIVE_CPF_KEY_REGEX = /^(?:.*[_-])?cpf(?:[_-].*)?$/i;

const FORMATTED_CPF_REGEX = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g;
const CONTEXTUAL_CPF_REGEX =
  /(\bcpf\b[\s:=/"']*?)(\d{3}\.?\d{3}\.?\d{3}-?\d{2})(?!\d)/gi;
const CONTEXTUAL_PASSWORD_REGEX =
  /(\b(?:password|passwd|senha)\b\s*[:=]\s*["']?)([^"'\s,&;}\]]+)(["']?)/gi;
const CONNECTION_STRING_PASSWORD_REGEX =
  /(postgres(?:ql)?:\/\/[^:\s/@]+:)([^@\s]+)(@)/gi;
const BEARER_TOKEN_REGEX = /(\bBearer\s+)([A-Za-z0-9\-._~+/]+=*)/gi;

export function maskSensitiveString(input: string): string {
  return input
    .replace(CONNECTION_STRING_PASSWORD_REGEX, `$1${REDACTED_VALUE}$3`)
    .replace(BEARER_TOKEN_REGEX, `$1${REDACTED_VALUE}`)
    .replace(CONTEXTUAL_PASSWORD_REGEX, `$1${REDACTED_VALUE}$3`)
    .replace(CONTEXTUAL_CPF_REGEX, `$1${MASKED_CPF}`)
    .replace(FORMATTED_CPF_REGEX, MASKED_CPF);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function maskSensitiveData<T>(
  value: T,
  seen: WeakSet<object> = new WeakSet(),
): T {
  if (typeof value === 'string') {
    return maskSensitiveString(value) as T;
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date || value instanceof RegExp) {
    return value;
  }

  if (value instanceof Error) {
    const sanitizedError = new Error(maskSensitiveString(value.message));
    sanitizedError.name = value.name;
    if (value.stack) {
      sanitizedError.stack = maskSensitiveString(value.stack);
    }
    return sanitizedError as T;
  }

  if (seen.has(value)) {
    return '[Circular]' as T;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => maskSensitiveData(item, seen)) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;
  const isCpfPixKeyObject =
    String(record.keyType ?? record.type ?? '').toUpperCase() === 'CPF';

  const result: Record<string, unknown> = {};

  for (const [key, entryValue] of Object.entries(record)) {
    if (SENSITIVE_PASSWORD_KEY_REGEX.test(key)) {
      result[key] = REDACTED_VALUE;
    } else if (SENSITIVE_CPF_KEY_REGEX.test(key)) {
      result[key] = MASKED_CPF;
    } else if (
      isCpfPixKeyObject &&
      (key === 'keyValue' || key === 'pixKey' || key === 'key') &&
      typeof entryValue === 'string'
    ) {
      result[key] = MASKED_CPF;
    } else {
      result[key] = maskSensitiveData(entryValue, seen);
    }
  }

  return result as T;
}
