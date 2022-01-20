export function toHex(value: any) {
  var ret = ((value < 0 ? 0x8 : 0) + ((value >> 28) & 0x7)).toString(16) + (value & 0xfffffff).toString(16);
  while (ret.length < 8) ret = '0' + ret;
  return ret;
};

export function hashObject(o: any, l: any) {
  l = l || 2;
  var i, c, r = [];
  for (i = 0; i < l; i++)
    r.push(i * 268803292);
  function stringify(o) {
    var i, r;
    if (o === null) return 'n';
    if (o === true) return 't';
    if (o === false) return 'f';
    if (o instanceof Date) return 'd:' + o.getTime();
    i = typeof o;
    if (i === 'string') return 's:' + o.replace(/([\\\\;])/g, '\\$1');
    if (i === 'number') return 'n:' + o;
    if (o instanceof Function) return 'm:' + o.toString().replace(/([\\\\;])/g, '\\$1');
    if (o instanceof Array) {
      r = [];
      for (i = 0; i < o.length; i++)
        r.push(stringify(o[i]));
      return 'a:' + r.join(';');
    }
    r = [];
    for (i in o) {
      r.push(i + ':' + stringify(o[i]))
    }
    return 'o:' + r.join(';');
  }
  o = stringify(o);
  for (i = 0; i < o.length; i++) {
    for (c = 0; c < r.length; c++) {
      r[c] = (r[c] << 13) - (r[c] >> 19);
      r[c] += o.charCodeAt(i) << (r[c] % 24);
      r[c] = r[c] & r[c];
    }
  }
  for (i = 0; i < r.length; i++) {
    r[i] = toHex(r[i]);
  }
  return r.join('');
}