import { SVGProps } from "react";

export default function CopyIcon(props: SVGProps<SVGSVGElement>) {
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
        d="M11.8096 9.9048V3.23814C11.8096 2.18616 10.9568 1.33337 9.9048 1.33337H3.23814C2.18616 1.33337 1.33337 2.18616 1.33337 3.23814V9.9048C1.33337 10.9568 2.18616 11.8096 3.23814 11.8096H9.9048C10.9568 11.8096 11.8096 10.9568 11.8096 9.9048Z"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.19055 11.8096V12.762C4.19055 13.814 5.04334 14.6667 6.09531 14.6667H12.762C13.814 14.6667 14.6667 13.814 14.6667 12.762V6.09531C14.6667 5.04334 13.814 4.19055 12.762 4.19055H11.8096"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
