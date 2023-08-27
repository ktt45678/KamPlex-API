import removeAccents from 'remove-accents';
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

export function slugMediaTitle(title: string, originalTitle?: string | null) {
  const slugTitle = slugify(removeAccents(title), { lower: true });
  const slugOriginalTitle = originalTitle ? slugify(removeAccents(originalTitle), { lower: true }) : null;
  if (!slugOriginalTitle || slugTitle === slugOriginalTitle)
    return slugTitle;
  if (slugTitle.includes(slugOriginalTitle))
    return slugTitle;
  if (slugOriginalTitle.includes(slugTitle))
    return slugOriginalTitle;
  return `${slugTitle}-${slugOriginalTitle}`;
}

// https://github.com/words/ap-style-title-case/blob/master/index.js
export function apStyleTitleCase(value: string, options?: { stopwords?: string, keepSpaces?: boolean }) {
  const defaults = ['a', 'an', 'and', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet'];

  const configuration = options || {};

  if (!value) return '';

  const stop = configuration.stopwords || defaults;
  const keep = configuration.keepSpaces || false;
  const splitter = /(\s+|[-‑–—,:;!?()])/;

  return value
    .split(splitter)
    .map((word, index, all) => {
      // The splitter:
      if (index % 2) {
        if (/\s+/.test(word)) return keep ? word : ' ';
        return word;
      }

      const lower = word.toLowerCase();

      if (index !== 0 && index !== all.length - 1 && stop.includes(lower)) {
        return lower;
      }

      return capitalize(word);
    })
    .join('');
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
