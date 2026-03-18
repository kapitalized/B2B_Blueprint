import * as migration_20260311_090402_init from './20260311_090402_init';
import * as migration_20260311_090655_add_users_role from './20260311_090655_add_users_role';
import * as migration_20260315_add_pages_meta_keywords from './20260315_add_pages_meta_keywords';
import * as migration_20260317_add_api_sources_and_runs from './20260317_add_api_sources_and_runs';

export const migrations = [
  {
    up: migration_20260311_090402_init.up,
    down: migration_20260311_090402_init.down,
    name: '20260311_090402_init',
  },
  {
    up: migration_20260311_090655_add_users_role.up,
    down: migration_20260311_090655_add_users_role.down,
    name: '20260311_090655_add_users_role',
  },
  {
    up: migration_20260315_add_pages_meta_keywords.up,
    down: migration_20260315_add_pages_meta_keywords.down,
    name: '20260315_add_pages_meta_keywords',
  },
  {
    up: migration_20260317_add_api_sources_and_runs.up,
    down: migration_20260317_add_api_sources_and_runs.down,
    name: '20260317_add_api_sources_and_runs',
  },
];
