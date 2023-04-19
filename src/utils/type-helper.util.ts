export function transformBigInt(value: Array<any>) {
  if (!Array.isArray(value))
    if (value == undefined || isNaN(value))
      return value;
    else
      return BigInt(value);
  const result = [];
  value.forEach(item => {
    if (item == undefined || isNaN(item)) {
      result.push(item);
    }
    else {
      result.push(BigInt(item));
    }
  });
  return result;
}
