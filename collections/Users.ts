import type { CollectionConfig } from 'payload';

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Admin user',
    plural: 'Admin users',
  },
  admin: {
    useAsTitle: 'email',
    description: 'CMS / Payload admins. For app sign-in users, see “App users” under App monitoring.',
  },
  auth: {
    tokenExpiration: 24 * 24 * 60 * 60 * 1000, // 24 days (max ~24.8) — keep admin logged in
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'User', value: 'user' },
      ],
      defaultValue: 'user',
      required: true,
      saveToJWT: true,
      admin: { position: 'sidebar' },
    },
  ],
};
