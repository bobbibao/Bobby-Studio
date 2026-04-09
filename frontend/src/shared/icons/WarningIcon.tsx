export const WarningIcon = ({ className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="48"
    height="48"
    fill="none"
    viewBox="0 0 48 48"
    className={className}
  >
    <rect width="48" height="48" fill="#F3E8FF" rx="24"></rect>
    <path
      stroke="#111113"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M24 20.001v4m0 4h.01m-1.72-13.14-8.47 14.14a1.998 1.998 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3l-8.47-14.14a2 2 0 0 0-3.42 0"
    ></path>
  </svg>
);
