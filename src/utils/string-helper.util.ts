import slugify from 'slugify';

export function appendToFilename(filename: string, value: string) {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex == -1) return filename + value;
  else return filename.substring(0, dotIndex) + value + filename.substring(dotIndex);
}

export function escapeRegExp(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export function reverseString(text: string) {
  return [...text].reverse().join('');
}

export function trimSlugFilename(filename: string, maxLength: number = 250) {
  const slugFilename = slugify(filename, { remove: /[^0-9a-zA-Z.\-_\s]/g });
  const filenameSplit = slugFilename.split('.');
  const ext = filenameSplit.pop();
  const name = filenameSplit.join('.');
  return name.substring(0, maxLength) + '.' + ext;
}
