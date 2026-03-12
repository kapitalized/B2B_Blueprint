'use client';

import { useProject } from './ProjectProvider';

export function ProjectPageTitle() {
  const project = useProject();
  if (!project) return <h1 className="text-2xl font-bold">Project</h1>;
  return (
    <h1 className="text-2xl font-bold">
      Project - {project.projectName}
    </h1>
  );
}
