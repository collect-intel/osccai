import { SVGProps } from "react";

export default function EditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.1905 1.80958C14.9795 2.59856 14.9795 3.87775 14.1905 4.66673L5.1429 13.7143L1.33337 14.6667L2.28575 10.9109L11.337 1.81323C12.0827 1.0637 13.2715 1.02329 14.065 1.69412L14.1905 1.80958Z"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.762 4.19055L13.7143 5.14293"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
