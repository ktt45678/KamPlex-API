export function appendToFilename(filename: string, value: string) {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex == -1) return filename + value;
  else return filename.substring(0, dotIndex) + value + filename.substring(dotIndex);
}