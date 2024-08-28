import { SVGProps } from "react";

export default function CSVIcon(props: SVGProps<SVGSVGElement>) {
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
        d="M14.6646 12.7599L14.6546 3.23613C14.6535 2.18495 13.801 1.33337 12.7499 1.33337H3.22605C2.2219 1.33337 1.39923 2.1104 1.32651 3.09598L1.32129 3.24014L1.3313 12.7639C1.33241 13.8151 2.18487 14.6667 3.23606 14.6667H12.7599C13.764 14.6667 14.5867 13.8897 14.6594 12.9041L14.6646 12.7599Z"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.14282 1.33337V14.4924"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.6666 5.14294H1.33329"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
