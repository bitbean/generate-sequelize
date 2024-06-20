export default function getDefaultValue(
  defaultValue: any,
  tsType: string,
  seqType: string,
): string | number | boolean | undefined {
  if (defaultValue === null || defaultValue === undefined) {
    return;
  }
  if (typeof defaultValue !== "string") {
    return defaultValue;
  }
  defaultValue = escapeSpecial(defaultValue);
  while (defaultValue.startsWith("(") && defaultValue.endsWith(")")) {
    // remove extra parens around mssql defaults
    defaultValue = defaultValue.replace(/^[(]/, "").replace(/[)]$/, "");
  }
  if (tsType === "boolean") {
    return /1|true/i.test(defaultValue);
  }
  let valText: string = defaultValue;
  if (tsType.endsWith("[]")) {
    valText = defaultValue.replace(/^{/, "").replace(/}$/, "");
    if (valText && tsType === "string[]") {
      // quote the array elements
      valText = valText
        .split(",")
        .map((s) => `"${s}"`)
        .join(",");
    }
    return `[${valText}]`;
  }
  if (tsType === "object") {
    return defaultValue.replace(/\\"/g, '"');
  }
  if (
    seqType === "DataTypes.UUID" ||
    defaultValue === "gen_random_uuid()" ||
    defaultValue === "uuid_generate_v4()"
  ) {
    return "DataTypes.UUIDV4";
  }
  if ((defaultValue as string).match(/\w+\(\)$/)) {
    return "fn('" + defaultValue.replace(/\(\)$/g, "") + "')";
  }
  if (tsType === "number" && Number(defaultValue)) {
    return Number(defaultValue);
  }
  if (tsType === "Date") {
    if (defaultValue === "CURRENT_TIMESTAMP") {
      return "DataTypes.NOW";
    }
    if (
      [
        "current_timestamp",
        "current_date",
        "current_time",
        "localtime",
        "localtimestamp",
      ].includes(defaultValue.toLowerCase())
    ) {
      return "literal('" + defaultValue + "')";
    }
  }
  return `"${defaultValue}"`;
}

function escapeSpecial(val: string) {
  return val.replace(/[\\"\n\t\r\f\b/]/g, (m) => `\\${m}`);
}
