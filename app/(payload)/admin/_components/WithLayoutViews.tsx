import React from 'react';
import { AdminViewLayout } from './AdminViewLayout';
import { AdminDashboardView } from './AdminDashboardView';
import { AppUsersView } from './AppUsersView';
import { AIModelsView } from './AIModelsView';
import { RunLogsView } from './RunLogsView';
import { UsageView } from './UsageView';
import { ProjectsView } from './ProjectsView';
import { ChatsView } from './ChatsView';
import { FilesView } from './FilesView';
import { PagesSEOView } from './PagesSEOView';
import { StripePlansView } from './StripePlansView';
import { BillingView } from './BillingView';
import { BillingsView } from './BillingsView';
import { CouponsView } from './CouponsView';
import { AIRunsView } from './AIRunsView';
import { EnvView } from './EnvView';
import { ExternalApisView } from './ExternalApisView';

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

function withLayout(Content: React.ComponentType) {
  return function Wrapped(props: ServerProps | { serverProps?: ServerProps }) {
    const serverProps = (props && 'serverProps' in props ? props.serverProps : props) ?? {};
    return (
      <AdminViewLayout serverProps={serverProps as ServerProps}>
        <Content />
      </AdminViewLayout>
    );
  };
}

export const AdminDashboardViewWithLayout = withLayout(AdminDashboardView);
export const AppUsersViewWithLayout = withLayout(AppUsersView);
export const AIModelsViewWithLayout = withLayout(AIModelsView);
export const RunLogsViewWithLayout = withLayout(RunLogsView);
export const UsageViewWithLayout = withLayout(UsageView);
export const ProjectsViewWithLayout = withLayout(ProjectsView);
export const ChatsViewWithLayout = withLayout(ChatsView);
export const FilesViewWithLayout = withLayout(FilesView);
export const PagesSEOViewWithLayout = withLayout(PagesSEOView);
export const StripePlansViewWithLayout = withLayout(StripePlansView);
export const BillingViewWithLayout = withLayout(BillingView);
export const BillingsViewWithLayout = withLayout(BillingsView);
export const CouponsViewWithLayout = withLayout(CouponsView);
export const AIRunsViewWithLayout = withLayout(AIRunsView);
export const EnvViewWithLayout = withLayout(EnvView);
export const ExternalApisViewWithLayout = withLayout(ExternalApisView);
