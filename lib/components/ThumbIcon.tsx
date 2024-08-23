import { SVGProps } from "react";

export default function ThumbIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="17"
      height="16"
      viewBox="0 0 17 16"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.993 13.9588L8.99898 12.7619H5.18945V6.09527H7.09422L9.76188 0.857178C10.3142 0.857178 10.7856 1.05244 11.1761 1.44296C11.5666 1.83349 11.7619 2.30489 11.7619 2.85718L10.9047 5.14289L14.7438 6.42259C15.6943 6.73941 16.2288 7.73292 15.9902 8.68892L15.925 8.89842L14.4453 12.8442C14.076 13.8291 12.978 14.3282 11.993 13.9588Z"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.33336 5.14294H4.23812C4.76411 5.14294 5.19051 5.56934 5.19051 6.09533V13.7144C5.19051 14.2404 4.76411 14.6668 4.23812 14.6668H2.33336C1.80738 14.6668 1.38098 14.2404 1.38098 13.7144V6.09533C1.38098 5.56934 1.80738 5.14294 2.33336 5.14294Z"
        stroke="inherit"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
