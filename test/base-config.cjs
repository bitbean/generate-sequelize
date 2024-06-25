// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();
/**
 * @type {import("generate-sequelize").GeneratorOptions}
 */
module.exports = {
  targetLib: "sequelize",
  database: process.env.DB_NAME,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  host: "localhost",
  dialect: "postgres",
  port: 5432,
  directory: "src/models",
  schema: "public",
  replacements: [[/as: "medium"/g, 'as: "media"']],
  joinTables: [
    "user_roles",
    "session_tasks",
    "slack_users_channels",
    "task_watchers",
  ],
};
