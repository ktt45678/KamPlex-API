export interface Translation {
  aliases?: string[];
  isAlias?: boolean;
  isPrimary?: boolean;
  language?: string;
  name?: string;
  overview?: string;
  /** @description Only populated for movie translations.  We disallow taglines without a title. */
  tagline?: string;
}
