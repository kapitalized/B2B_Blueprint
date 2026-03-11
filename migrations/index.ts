import * as migration_20260311_090402_init from './20260311_090402_init';
import * as migration_20260311_090655_add_users_role from './20260311_090655_add_users_role';

export const migrations = [
  {
    up: migration_20260311_090402_init.up,
    down: migration_20260311_090402_init.down,
    name: '20260311_090402_init',
  },
  {
    up: migration_20260311_090655_add_users_role.up,
    down: migration_20260311_090655_add_users_role.down,
    name: '20260311_090655_add_users_role'
  },
];
