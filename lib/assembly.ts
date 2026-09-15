// ordered typed components -> one display string
export interface Component {
  value: string;
  script: string;
}

// scriptio-continua scripts: written without spaces between words, so name
// components in them are joined with no separator
export const SCRIPTIO_CONTINUA: ReadonlySet<string> = new Set([
  "Hani", "Hans", "Hant", "Jpan", "Hira", "Kana", "Bopo", // Han + Japanese
  "Kore", "Hang", // Korean
  "Thai", "Laoo", "Khmr", "Mymr", "Tibt", "Java", "Bali", // SE Asian
]);

// true when a name written entirely in this script uses no inter-word spaces
export function isScriptioContinua(script: string): boolean {
  return SCRIPTIO_CONTINUA.has(script);
}

// Empty if every component is scriptio-continua, else a space.
// a mixed-script name takes the space, since at least one boundary needs marking.
export function separatorFor(components: readonly Component[]): "" | " " {
  return components.every((c) => isScriptioContinua(c.script)) ? "" : " ";
}

export function assembleDisplay(components: readonly Component[]): string {
  return components.map((c) => c.value).join(separatorFor(components));
}
