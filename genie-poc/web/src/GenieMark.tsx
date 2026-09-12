export default function GenieMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      className="genie-mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="16" fill="#5b3cc4" />
      <circle cx="16" cy="16" r="15" fill="none" stroke="#c4b5fd" strokeWidth="1" opacity="0.45" />
      <path
        d="M10.5 20.5c1.8-1.2 3.2-1.8 5.5-1.8s3.7.6 5.5 1.8"
        fill="none"
        stroke="#f5e6a8"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M12 19c.4-3.2 1.8-6.2 4-7.6 2.2 1.4 3.6 4.4 4 7.6"
        fill="#ede9fe"
        opacity="0.95"
      />
      <path d="M16 8.2c.15 1.4.9 2.2 2.2 2.6-1.3.3-2.05 1.1-2.2 2.5-.15-1.4-.9-2.2-2.2-2.5 1.3-.4 2.05-1.2 2.2-2.6Z" fill="#f5e6a8" />
    </svg>
  );
}
