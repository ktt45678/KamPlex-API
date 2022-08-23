export function isEmptyObject(value: Object): boolean {
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i++) {
    if (value[keys[i]] != null)
      return false;
  };
  return true;
}