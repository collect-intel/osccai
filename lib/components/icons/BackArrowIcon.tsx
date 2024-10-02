import { SVGProps } from "react";

export default function BackArrowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M15 8H1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 15L1 8L8 1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
