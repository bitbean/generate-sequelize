export default function getEnumValues(
  type: string,
  special?: string[],
): string[] {
  if (special) {
    // postgres
    return special.map((v: string) => `"${v}"`);
  } else {
    // mysql
    return type.substring(5, type.length - 1).split(",");
  }
}
