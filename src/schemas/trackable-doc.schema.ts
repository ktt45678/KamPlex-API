export class TrackableDoc<T> {
  _original: Omit<T, '_original'>;
}
