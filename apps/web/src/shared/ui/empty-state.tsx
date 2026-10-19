import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <span className="text-neutral-400">{icon}</span>
      <h2 className="mt-4 text-h3 text-neutral-900">{title}</h2>
      {description ? (
        <p className="mt-1 max-w-md text-body text-neutral-600">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
