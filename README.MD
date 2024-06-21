# Generate Sequelize models

This is a command line tool that generates Sequelize models from a database schema.

## Installation

`npm install generate-sequelize -D`

## Usage

`npx generate-sequelize [path-to-config (default: .generate-sequelize.cjs)]`

## Example config

```
// ./.generate-sequelize.cjs
/*** @type {import("generate-sequelize").CustomOptions} */
module.exports = {
    targetLib: "sequelize",
    database: "database",
    username: "username",
    password: "password",
    host: "localhost",
    dialect: "mysql",
    directory: "models",
    joinTables: ["users_roles"],
    schema: "public",
    replacements: [[/as: "medium"/g, 'as: "media"']],
    prettierOptions: {
        singleQuote: true,
        trailingComma: "all",
        bracketSpacing: true,
        tabWidth: 4,
    }
}
```

## Example output

```
// models/users.ts
/* auto-generated imports */
import { phones } from './phones';
import { user_roles } from './user_roles';
/* auto-generated imports */
import {
    /* auto-generated sequelize imports */
    /* auto-generated sequelize imports */
    Model,
    Sequelize,
    Optional,
    DataTypes,
} from 'sequelize';

type usersAttributeKeys =
    /* auto-generated attributes */
    | 'id'
    | 'email'
    | 'first_name'
    | 'last_name'
    | 'created_at'
    | 'updated_at'
    | 'deleted_at';
/* auto-generated attributes */

export type usersAttributes = Pick<users, usersAttributeKeys>;

export type usersOptionalAttributes =
    /* auto-generated optional attributes */
    'id';
/* auto-generated optional attributes */

export type usersCreationAttributes = Optional<
    usersAttributes,
    usersOptionalAttributes
>;

export class users
    extends Model<usersAttributes, usersCreationAttributes>
    implements usersAttributes
{
    /* auto-generated properties */
    declare id: number;
    declare email: string;
    declare first_name: string;
    declare last_name: string;
    declare created_at?: Date;
    declare updated_at?: Date;
    declare deleted_at?: Date;
    /* auto-generated properties */

    /* auto-generated associations */
    declare phones: phones[];
    declare user_roles: user_roles[];
    /* auto-generated associations */

    static initModel(sequelize: Sequelize): typeof users {
        return users.init(
            {
                /* auto-generated definitions */
                id: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true,
                },
                email: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                first_name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                last_name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                created_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                    defaultValue: DataTypes.NOW,
                },
                updated_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                deleted_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                /* auto-generated definitions */
            },
            {
                sequelize,
                indexes: [
                    /* auto-generated indexes */
                    {
                        name: 'users_calendly_user_info_key',
                        unique: true,
                        fields: ['calendly_user_info'],
                    },
                    {
                        name: 'users_email_key',
                        unique: true,
                        fields: ['email'],
                    },
                    { name: 'users_first_name', fields: ['first_name'] },
                    { name: 'users_last_name', fields: ['last_name'] },
                    { name: 'users_pkey', unique: true, fields: ['id'] },
                    /* auto-generated indexes */
                ],
            },
        );
    }
}

```

If a file does not exist it will be created using the default template. If it does exist, it will overwrite all regions marked with:

```
/* auto-generated {{regionName}} */
// all code inside here will be overwritten
/* auto-generated {{regionName}} */
```

So if you would like to add to a Model it can be done as follows:

```
// models/users.ts
/* auto-generated imports */
import { phones } from './phones';
import { user_roles } from './user_roles';
/* auto-generated imports */
import {
    /* auto-generated sequelize imports */
    /* auto-generated sequelize imports */
    Model,
    Sequelize,
    Optional,
    DataTypes,
} from 'sequelize';
import { tasks } from './tasks'; // will not be overwritten

type usersAttributeKeys =
    | 'fullName' // will not be overwritten
    /* auto-generated attributes */
    | 'id'
    | 'email'
    | 'first_name'
    | 'last_name'
    | 'created_at'
    | 'updated_at'
    | 'deleted_at'
/* auto-generated attributes */
    | 'hasTasks'; // will not be overwritten

export type usersAttributes = Pick<users, usersAttributeKeys>;

export type usersOptionalAttributes =
    | 'hasTasks' // will not be overwritten
    /* auto-generated optional attributes */
    | 'id';
/* auto-generated optional attributes */

export type usersCreationAttributes = Optional<
    usersAttributes,
    usersOptionalAttributes
>;

export class users
    extends Model<usersAttributes, usersCreationAttributes>
    implements usersAttributes
{
    /* auto-generated properties */
    declare id: number;
    declare email: string;
    declare first_name: string;
    declare last_name: string;
    declare created_at?: Date;
    declare updated_at?: Date;
    declare deleted_at?: Date;
    /* auto-generated properties */

    declare fullName: string; // will not be overwritten
    declare hasTasks?: string; // will not be overwritten

    /* auto-generated associations */
    declare phones: phones[];
    declare user_roles: user_roles[];
    /* auto-generated associations */

    declares tasks: tasks[]; // will not be overwritten

    static initModel(sequelize: Sequelize): typeof users {
        return users.init(
            {
                /* auto-generated definitions */
                id: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true,
                },
                email: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                first_name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                last_name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                created_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                    defaultValue: DataTypes.NOW,
                },
                updated_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                deleted_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                /* auto-generated definitions */
                fullName: { // will not be overwritten
                    type: DataTypes.VIRTUAL,
                    get() {
                        return `${this.first_name} ${this.last_name}`;
                    },
                },
                hasTasks: { // will not be overwritten
                    type: DataTypes.VIRTUAL,
                    get() {
                        if (this.tasks) {
                            return this.tasks.length > 0;
                        }
                    },
                },
            },
            {
                sequelize,
                indexes: [
                    /* auto-generated indexes */
                    {
                        name: 'users_calendly_user_info_key',
                        unique: true,
                        fields: ['calendly_user_info'],
                    },
                    {
                        name: 'users_email_key',
                        unique: true,
                        fields: ['email'],
                    },
                    { name: 'users_first_name', fields: ['first_name'] },
                    { name: 'users_last_name', fields: ['last_name'] },
                    { name: 'users_pkey', unique: true, fields: ['id'] },
                    /* auto-generated indexes */
                ],
            },
        );
    }
}

```

## Example output using sequelize-typescript

```
import {
    /* auto-generated sequelize imports */
    PrimaryKey,
    AutoIncrement,
    AllowNull,
    Column,
    Default,
    DataType as DataTypes,
    HasMany,
    /* auto-generated sequelize imports */
    Table,
    Model,
} from 'sequelize-typescript';
/* auto-generated imports */
import { phones } from './phones';
import { user_roles } from './user_roles';
/* auto-generated imports */
import { Optional } from 'sequelize';

type usersAttributeKeys =
    /* auto-generated attributes */
    | 'id'
    | 'email'
    | 'first_name'
    | 'last_name'
    | 'created_at'
    | 'updated_at'
    | 'deleted_at';
/* auto-generated attributes */

export type usersAttributes = Pick<users, usersAttributeKeys>;

export type usersOptionalAttributes =
    /* auto-generated optional attributes */
    'id';
/* auto-generated optional attributes */

export type usersCreationAttributes = Optional<
    usersAttributes,
    usersOptionalAttributes
>;

@Table({
    indexes: [
        /* auto-generated indexes */
        { name: 'users_email_key', unique: true, fields: ['email'] },
        { name: 'users_first_name', fields: ['first_name'] },
        { name: 'users_last_name', fields: ['last_name'] },
        { name: 'users_pkey', unique: true, fields: ['id'] },
        /* auto-generated indexes */
    ],
})
export class users
    extends Model<usersAttributes, usersCreationAttributes>
    implements usersAttributes
{
    /* auto-generated properties */
    @PrimaryKey
    @AutoIncrement
    @AllowNull(false)
    @Column(DataTypes.INTEGER)
    declare id: number;

    @AllowNull(false)
    @Column(DataTypes.STRING)
    declare email: string;

    @AllowNull(false)
    @Column(DataTypes.STRING)
    declare first_name: string;

    @AllowNull(false)
    @Column(DataTypes.STRING)
    declare last_name: string;

    @Default(DataTypes.NOW)
    @AllowNull(true)
    @Column(DataTypes.DATE)
    declare created_at?: Date;

    @AllowNull(true)
    @Column(DataTypes.DATE)
    declare updated_at?: Date;

    @AllowNull(true)
    @Column(DataTypes.DATE)
    declare deleted_at?: Date;
    /* auto-generated properties */

    /* auto-generated associations */
    @HasMany(() => phones, 'user_id')
    declare phones: phones[];

    @HasMany(() => user_roles, 'user_id')
    declare user_roles: user_roles[];
    /* auto-generated associations */
}
```

## Example output using @sequelize/core (version 7, alpha)

```
import {
    /* auto-generated sequelize imports */
    PrimaryKey,
    AutoIncrement,
    NotNull,
    Attribute,
    AllowNull,
    Default,
    HasMany,
    /* auto-generated sequelize imports */
    Table,
} from '@sequelize/core/decorators-legacy';
/* auto-generated imports */
import { phones } from './phones';
import { user_roles } from './user_roles';
/* auto-generated imports */
import { Model, DataTypes } from '@sequelize/core';

type usersAttributeKeys =
    /* auto-generated attributes */
    | 'id'
    | 'email'
    | 'first_name'
    | 'last_name'
    | 'created_at'
    | 'updated_at'
    | 'deleted_at';
/* auto-generated attributes */

export type usersAttributes = Pick<users, usersAttributeKeys>;

export type usersOptionalAttributes =
    /* auto-generated optional attributes */
    'id';
/* auto-generated optional attributes */

export type usersCreationAttributes = Omit<
    usersAttributes,
    usersOptionalAttributes
> &
    Partial<Pick<usersAttributes, usersOptionalAttributes>>;

@Table({
    indexes: [
        /* auto-generated indexes */
        { name: 'users_email_key', unique: true, fields: ['email'] },
        { name: 'users_first_name', fields: ['first_name'] },
        { name: 'users_last_name', fields: ['last_name'] },
        { name: 'users_pkey', unique: true, fields: ['id'] },
        /* auto-generated indexes */
    ],
})
export class users
    extends Model<usersAttributes, usersCreationAttributes>
    implements usersAttributes
{
    /* auto-generated properties */
    @PrimaryKey
    @AutoIncrement
    @NotNull
    @Attribute(DataTypes.INTEGER)
    declare id: number;

    @NotNull
    @Attribute(DataTypes.STRING)
    declare email: string;

    @NotNull
    @Attribute(DataTypes.STRING)
    declare first_name: string;

    @NotNull
    @Attribute(DataTypes.STRING)
    declare last_name: string;

    @Default(DataTypes.NOW)
    @AllowNull
    @Attribute(DataTypes.DATE)
    declare created_at?: Date;

    @AllowNull
    @Attribute(DataTypes.DATE)
    declare updated_at?: Date;

    @AllowNull
    @Attribute(DataTypes.DATE)
    declare deleted_at?: Date;
    /* auto-generated properties */

    /* auto-generated associations */
    @HasMany(() => phones, 'user_id')
    declare phones: phones[];

    @HasMany(() => user_roles, 'user_id')
    declare user_roles: user_roles[];
    /* auto-generated associations */
}
```
