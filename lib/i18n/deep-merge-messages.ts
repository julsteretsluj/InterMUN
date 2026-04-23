/** Shallow-recursive merge: override wins; nested objects merge. Arrays replaced by override. */
export function deepMergeMessages<T extends Record<string, unknown>>(base: T, override: T): T {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const o = override[key];
    const b = base[key];
    if (
      o !== null &&
      typeof o === "object" &&
      !Array.isArray(o) &&
      b !== null &&
      typeof b === "object" &&
      !Array.isArray(b)
    ) {
      result[key as keyof T] = deepMergeMessages(
        b as Record<string, unknown>,
        o as Record<string, unknown>
      ) as T[keyof T];
    } else if (o !== undefined) {
      result[key as keyof T] = o as T[keyof T];
    }
  }
  return result;
}
