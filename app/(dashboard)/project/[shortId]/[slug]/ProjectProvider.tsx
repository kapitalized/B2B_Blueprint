'use client';

import { createContext, useContext, useMemo } from 'react';

export interface ProjectFromLayout {
  id: string;
  projectName: string;
  shortId: string | null;
  slug: string | null;
  projectAddress?: string | null;
  projectDescription?: string | null;
  projectObjectives?: string | null;
  country?: string | null;
  projectStatus?: string | null;
  numberOfLevels?: number | null;
}

const ProjectContext = createContext<ProjectFromLayout | null>(null);

export function ProjectProvider({
  project,
  children,
}: {
  project: ProjectFromLayout;
  children: React.ReactNode;
}) {
  const value = useMemo(() => project, [project.id]);
  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectFromLayout | null {
  return useContext(ProjectContext);
}
