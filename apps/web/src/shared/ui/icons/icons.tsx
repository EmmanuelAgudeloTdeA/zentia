import type { ReactNode, SVGProps } from 'react';

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number };

function createIcon(paths: ReactNode) {
  return function Icon({ size = 20, ...props }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

export const MenuIcon = createIcon(<path d="M4 6h16M4 12h16M4 18h16" />);

export const CloseIcon = createIcon(<path d="M6 6l12 12M18 6L6 18" />);

export const AlertCircleIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5h.01" />
  </>,
);

export const InfoIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.5h.01" />
  </>,
);

export const AlertTriangleIcon = createIcon(
  <>
    <path d="M10.3 4.1L2.6 17.5A2 2 0 004.3 20.5h15.4a2 2 0 001.7-3L13.7 4.1a2 2 0 00-3.4 0z" />
    <path d="M12 9.5v4M12 17h.01" />
  </>,
);

export const CheckCircleIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" />
  </>,
);

export const CompassIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
  </>,
);

export const LockIcon = createIcon(
  <>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </>,
);

export const SpinnerIcon = createIcon(<path d="M12 3a9 9 0 109 9" />);

export const EyeIcon = createIcon(
  <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);

export const EyeOffIcon = createIcon(
  <>
    <path d="M10.6 5.6A9.7 9.7 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 01-2.6 3.4M6.6 6.6C4 8.3 2.5 12 2.5 12S6 18.5 12 18.5a9.4 9.4 0 005.4-1.6" />
    <path d="M9.9 9.9a3 3 0 004.2 4.2M3 3l18 18" />
  </>,
);

export const ArrowRightIcon = createIcon(<path d="M5 12h14M13 6l6 6-6 6" />);

export const ArrowLeftIcon = createIcon(<path d="M19 12H5M11 6l-6 6 6 6" />);

export const ChevronDownIcon = createIcon(<path d="M6 9l6 6 6-6" />);

export const KeyIcon = createIcon(
  <>
    <circle cx="8" cy="15" r="4" />
    <path d="M10.8 12.2L20 3M16 7l3 3M14 9l2 2" />
  </>,
);

export const LogOutIcon = createIcon(
  <>
    <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3" />
    <path d="M10 17l-5-5 5-5M5 12h11" />
  </>,
);

export const CheckIcon = createIcon(<path d="M5 12.5l4.5 4.5L19 7.5" />);

export const CircleIcon = createIcon(<circle cx="12" cy="12" r="8" />);
