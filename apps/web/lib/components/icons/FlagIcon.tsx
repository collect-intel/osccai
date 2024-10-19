import { SVGProps } from "react";

export default function FlagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="12"
      height="15"
      viewBox="0 0 12 15"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M1.23804 13.6667V3.19055"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.23804 3.19053C1.87296 1.92069 2.82534 1.28577 4.09518 1.28577C5.99994 1.28577 5.99994 3.19053 7.9047 3.19053C9.17455 3.19053 10.1269 2.87307 10.7618 2.23815V7.95243C10.1269 8.58735 9.17455 8.90481 7.9047 8.90481C5.99994 8.90481 5.99994 7.00005 4.09518 7.00005C2.82534 7.00005 1.87296 7.63497 1.23804 8.90481V3.19053Z"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
