import React from 'react';
import { AdminViewLayout } from './AdminViewLayout';
import { DatabaseView } from './DatabaseView';

type ServerProps = Record<string, unknown> & {
  initPageResult?: Record<string, unknown>;
  collectionConfig?: { slug?: string };
  docID?: string | number;
  globalConfig?: { slug?: string };
  i18n?: unknown;
  params?: unknown;
  payload?: unknown;
  searchParams?: unknown;
  viewActions?: unknown[];
};

export function DatabaseViewWithLayout(props: ServerProps | { serverProps?: ServerProps }) {
  const serverProps = (props && 'serverProps' in props ? props.serverProps : props) ?? {};
  return (
    <AdminViewLayout serverProps={serverProps as ServerProps}>
      <DatabaseView />
    </AdminViewLayout>
  );
}
