function Icon({ size = 18, children }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {children}
        </svg>
    );
}

export const MicIcon = ({ size }) => (
    <Icon size={size}>
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
        <path d="M12 18v4" />
        <path d="M8 22h8" />
    </Icon>
);

export const StopIcon = ({ size }) => (
    <Icon size={size}>
        <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </Icon>
);

export const PauseIcon = ({ size }) => (
    <Icon size={size}>
        <path d="M9 5v14" strokeWidth="3" />
        <path d="M15 5v14" strokeWidth="3" />
    </Icon>
);

export const PlayIcon = ({ size }) => (
    <Icon size={size}>
        <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
    </Icon>
);

export const EditIcon = ({ size }) => (
    <Icon size={size}>
        <path d="M4 20h4L19 9l-4-4L4 16z" />
        <path d="M13 7l4 4" />
    </Icon>
);

export const TrashIcon = ({ size }) => (
    <Icon size={size}>
        <path d="M4 7h16" />
        <path d="M10 11v6M14 11v6" />
        <path d="M6 7l1 13h10l1-13" />
        <path d="M9 7V4h6v3" />
    </Icon>
);

export const FileIcon = ({ size }) => (
    <Icon size={size}>
        <path d="M6 2h8l5 5v15H6z" />
        <path d="M14 2v5h5" />
        <path d="M9 13h6M9 17h6" />
    </Icon>
);

export const CalendarIcon = ({ size }) => (
    <Icon size={size}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
    </Icon>
);

export const ClockIcon = ({ size }) => (
    <Icon size={size}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
    </Icon>
);

export const SearchIcon = ({ size }) => (
    <Icon size={size}>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
    </Icon>
);

export const SortIcon = ({ size }) => (
    <Icon size={size}>
        <path d="M7 4v16M3 8l4-4 4 4" />
        <path d="M17 20V4M13 16l4 4 4-4" />
    </Icon>
);

export const WaveIcon = ({ size }) => (
    <Icon size={size}>
        <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
    </Icon>
);
