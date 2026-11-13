const canonicalUuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function isCanonicalUuid(value) {
  return typeof value === 'string' && value.length === 36 && canonicalUuidPattern.test(value);
}
