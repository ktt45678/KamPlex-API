export function isEmptyObject(value: Object): boolean {
  Object.keys(value).forEach(key => {
    if (value[key] != null) {
      return false;
    }
  });
  return true;
}