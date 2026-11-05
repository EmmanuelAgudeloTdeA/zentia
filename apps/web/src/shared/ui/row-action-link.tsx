import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { buttonClasses } from './button';

interface RowActionLinkProps {
  to: string;
  label: string;
  icon: ReactNode;
}

/** Acción visible de una fila de tabla (`ghost` `sm`); en pantallas medianas solo muestra el icono. */
export function RowActionLink({ to, label, icon }: RowActionLinkProps) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className={`${buttonClasses('ghost', 'sm')} px-2 lg:px-3`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}
