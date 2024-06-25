// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require("./base-config.cjs");

module.exports = {
  ...config,
  targetLib: "sequelize",
  directory: "test/sequelize-models",
};
