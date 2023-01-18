export function isEmptyObject(value: Object): boolean {
  if (!value) return true;
  for (const key in value) {
    if (value[key] != null)
      return false;
  };
  return true;
}

export function isEqualShallow(value: object, other: object, options: { strict: boolean } = { strict: false }) {
  if (value === other) return true;
  for (let key in value) {
    if (value[key] !== other[key]) {
      return false;
    }
  }
  if (options.strict) {
    for (let key in other) {
      if (!(key in value)) {
        return false;
      }
    }
  }
  return true;
}

export function arrayEqualShallow(value: (number | string | boolean | object)[], other: (number | string | boolean | object)[]) {
  if (value.length !== other.length) return false;
  for (let i = 0; i < value.length; i++) {
    const v = value[i];
    const o = other[i];
    if (typeof v === 'object' && typeof o === 'object') {
      for (let key in v) {
        if (v[key] !== o[key]) {
          return false;
        }
      }
    }
    else {
      if (v !== o)
        return false;
    }
  }
  return true;
}
