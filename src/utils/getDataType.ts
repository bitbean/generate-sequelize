import getEnumValues from "./getEnumValues";

export default function getDataType(
  type: string,
  special?: string[],
  elementType?: string,
): string {
  type = type.toLowerCase();
  const length = type.match(/\(\d+\)/);
  const precision = type.match(/\(\d+,\d+\)/);
  let val = null;
  let typematch = null;

  if (
    type === "boolean" ||
    type === "bit(1)" ||
    type === "bit" ||
    type === "tinyint(1)"
  ) {
    val = "DataTypes.BOOLEAN";

    // postgres range types
  } else if (type === "numrange") {
    val = "DataTypes.RANGE(DataTypes.DECIMAL)";
  } else if (type === "int4range") {
    val = "DataTypes.RANGE(DataTypes.INTEGER)";
  } else if (type === "int8range") {
    val = "DataTypes.RANGE(DataTypes.BIGINT)";
  } else if (type === "daterange") {
    val = "DataTypes.RANGE(DataTypes.DATEONLY)";
  } else if (type === "tsrange" || type === "tstzrange") {
    val = "DataTypes.RANGE(DataTypes.DATE)";
  } else if (
    (typematch = type.match(/^(bigint|smallint|mediumint|tinyint|int)/))
  ) {
    // integer subtypes
    val =
      "DataTypes." +
      (typematch[0] === "int" ? "INTEGER" : typematch[0].toUpperCase());
    if (/unsigned/i.test(type)) {
      val += ".UNSIGNED";
    }
    if (/zerofill/i.test(type)) {
      val += ".ZEROFILL";
    }
  } else if (type === "nvarchar(max)" || type === "varchar(max)") {
    val = "DataTypes.TEXT";
  } else if (type.match(/n?varchar|string|varying/)) {
    val = "DataTypes.STRING" + (length !== null ? length : "");
    if (val === "DataTypes.STRING(255)") val = "DataTypes.STRING";
  } else if (type.match(/^n?char/)) {
    val = "DataTypes.CHAR" + (length !== null ? length : "");
  } else if (type.match(/^real/)) {
    val = "DataTypes.REAL";
  } else if (type.match(/text$/)) {
    val = "DataTypes.TEXT" + (length !== null ? length : "");
  } else if (type === "date") {
    val = "DataTypes.DATEONLY";
  } else if (type.match(/^(date|timestamp|year)/)) {
    val = "DataTypes.DATE" + (length !== null ? length : "");
  } else if (type.match(/^(time)/)) {
    val = "DataTypes.TIME";
  } else if (type.match(/^(float|float4)/)) {
    val = "DataTypes.FLOAT" + (precision !== null ? precision : "");
  } else if (type.match(/^(decimal|numeric)/)) {
    val = "DataTypes.DECIMAL" + (precision !== null ? precision : "");
  } else if (type.match(/^money/)) {
    val = "DataTypes.DECIMAL(19,4)";
  } else if (type.match(/^smallmoney/)) {
    val = "DataTypes.DECIMAL(10,4)";
  } else if (type.match(/^(float8|double)/)) {
    val = "DataTypes.DOUBLE" + (precision !== null ? precision : "");
  } else if (type.match(/^uuid|uniqueidentifier/)) {
    val = "DataTypes.UUID";
  } else if (type.match(/^jsonb/)) {
    val = "DataTypes.JSONB";
  } else if (type.match(/^json/)) {
    val = "DataTypes.JSON";
  } else if (type.match(/^geometry/)) {
    const gtype = elementType ? `(${elementType})` : "";
    val = `DataTypes.GEOMETRY${gtype}`;
  } else if (type.match(/^geography/)) {
    const gtype = elementType ? `(${elementType})` : "";
    val = `DataTypes.GEOGRAPHY${gtype}`;
  } else if (type.match(/^array/)) {
    const eltype = elementType ? getDataType(elementType) : "";
    val = `DataTypes.ARRAY(${eltype})`;
  } else if (type.match(/(binary|image|blob|bytea)/)) {
    val = "DataTypes.BLOB";
  } else if (type.match(/^hstore/)) {
    val = "DataTypes.HSTORE";
  } else if (type.match(/^inet/)) {
    val = "DataTypes.INET";
  } else if (type.match(/^cidr/)) {
    val = "DataTypes.CIDR";
  } else if (type.match(/^oid/)) {
    val = "DataTypes.INTEGER";
  } else if (type.match(/^macaddr/)) {
    val = "DataTypes.MACADDR";
  } else if (type.match(/^enum(\(.*\))?$/)) {
    const enumValues = getEnumValues(type, special);
    val = `DataTypes.ENUM(${enumValues})`;
  } else if (type.match(/tsvector/)) {
    val = "DataTypes.TSVECTOR";
  } else if (type.match(/hstore/)) {
    val = "DataTypes.HSTORE";
  }

  return val as string;
}
