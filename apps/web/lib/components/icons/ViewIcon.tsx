import { SVGProps } from "react";

export default function ViewIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="16"
      viewBox="0 0 18 16"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.2857 12.7587V7.04441C13.2857 5.99244 12.4329 5.13965 11.381 5.13965H2.80955C1.75758 5.13965 0.904785 5.99244 0.904785 7.04441V12.7587C0.904785 13.8107 1.75758 14.6635 2.80955 14.6635H11.381C12.4329 14.6635 13.2857 13.8107 13.2857 12.7587Z"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.1905 12.7586V6.09689C15.1905 4.51893 13.9113 3.23975 12.3334 3.23975H12.3285L3.76196 3.25455"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.0953 10.8539V5.14619C17.0953 3.04225 15.3897 1.33667 13.2858 1.33667C13.2836 1.33667 13.2814 1.33667 13.2792 1.33667L5.66675 1.34983"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
