import React from 'react';
import { AdminViewLayout } from './AdminViewLayout';
import { CouponsView } from './CouponsView';

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

export function CouponsViewWithLayout(
  props: ServerProps | { serverProps?: ServerProps }
) {
  const serverProps = (props && 'serverProps' in props ? props.serverProps : props) ?? {};
  return (
    <AdminViewLayout serverProps={serverProps as ServerProps}>
      <CouponsView />
    </AdminViewLayout>
  );
}
