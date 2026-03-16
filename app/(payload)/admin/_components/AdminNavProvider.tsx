'use client';

/**
 * On load: if the sidebar is collapsed, click the menu button so Payload opens it and layout stays correct.
 */
import React, { useEffect } from 'react';

function openNavIfCollapsed() {
  const panel = document.querySelector('.nav__scroll')?.parentElement;
  if (!panel) return;
  const el = panel as HTMLElement;
  const rect = el.getBoundingClientRect();
  const isCollapsed = rect.width < 50 || rect.left < -100;
  if (!isCollapsed) return;
  // Find menu toggle: a button in the page header that is not inside the nav drawer
  const header = document.querySelector('header');
  if (!header) return;
  const buttons = header.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.closest('.nav__scroll') || btn.classList.contains('nav__mobile-close')) continue;
    (btn as HTMLButtonElement).click();
    break;
  }
}

export function AdminNavProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const t1 = setTimeout(openNavIfCollapsed, 300);
    const t2 = setTimeout(openNavIfCollapsed, 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return <>{children}</>;
}
