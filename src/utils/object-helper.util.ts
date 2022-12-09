export function isEmptyObject(value: Object): boolean {
  if (!value) return true;
  for (const key in value) {
    if (value[key] != null)
      return false;
  };
  return true;
}
