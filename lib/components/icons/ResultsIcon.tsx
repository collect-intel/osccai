import { SVGProps } from "react";

export default function ResultsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="15"
      height="16"
      viewBox="0 0 15 16"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M1.33337 1.33337V12.7619C1.33337 13.8139 2.18616 14.6667 3.23814 14.6667H14.1905"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.19055 8.95239V11.8095"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 6.09534V11.8096"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.8096 3.23816V11.8096"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
