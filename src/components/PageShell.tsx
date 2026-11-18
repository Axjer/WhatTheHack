import type { ReactNode } from 'react';

type PageShellProps = {
  title: string;
  children: ReactNode;
};

/** 內頁共用的版心與 H1 */
export default function PageShell({ title, children }: PageShellProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-16">
      <h1>{title}</h1>
      <div className="mt-4 text-text-secondary">{children}</div>
    </div>
  );
}
