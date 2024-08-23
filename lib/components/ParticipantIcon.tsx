import { SVGProps } from "react";

export default function ParticipantIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="17"
      viewBox="0 0 16 17"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M8.00004 9.00003C9.578 9.00003 10.8572 7.72084 10.8572 6.14289V4.23812C10.8572 2.66017 9.578 1.38098 8.00004 1.38098C6.42208 1.38098 5.1429 2.66017 5.1429 4.23812V6.14289C5.1429 7.72084 6.42208 9.00003 8.00004 9.00003ZM8.00004 9.00003C11.156 9.00003 14.6667 10.9861 14.6667 14.0208V14.7143C14.6667 15.2403 14.2403 15.6667 13.7143 15.6667H2.28575C1.75977 15.6667 1.33337 15.2403 1.33337 14.7143V14.0208C1.33337 10.9861 4.84413 9.00003 8.00004 9.00003Z"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
