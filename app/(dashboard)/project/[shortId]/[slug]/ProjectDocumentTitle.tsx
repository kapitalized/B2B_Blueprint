'use client';

import { useEffect } from 'react';
import { useProject } from './ProjectProvider';

export function ProjectDocumentTitle() {
  const project = useProject();
  useEffect(() => {
    if (project?.projectName) {
      const prev = document.title;
      document.title = `Project - ${project.projectName}`;
      return () => { document.title = prev; };
    }
  }, [project?.projectName]);
  return null;
}
