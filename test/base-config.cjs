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
  joinTables: {
    user_roles: ["user_id", "org_id", "role_id"],
    session_tasks: true,
    task_media: [
      ["task_id", "media_id"],
      ["chat_id", "media_id"],
    ],
    slack_users_channels: true,
    task_watchers: true,
  },
  relationRenames: {
    organizations: {
      users: "default_org_users",
    },
  },
  joinTableRenames: {
    task_watchers: {
      user_id: "watchers",
    },
  },
};
