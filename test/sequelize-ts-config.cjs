// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require("./base-config.cjs");

module.exports = {
  ...config,
  targetLib: "sequelize-typescript",
  directory: "test/sequelize-ts-models",
};
