import React, { ReactNode, MouseEvent } from "react";

const VARIANTS = ["primary", "secondary", "danger", "edit"] as const;
type ButtonVariant = (typeof VARIANTS)[number];

interface ButtonProps {
  title?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
  ariaLabel?: string;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
  icon,
  children,
  ariaLabel,
}) => {
  const variantClasses: Record<ButtonVariant, string> = {
    primary: "bg-teal text-white hover:bg-teal/80",
    secondary: "bg-gray-300 text-gray-800 hover:bg-gray-400",
    danger: "bg-danger text-white hover:bg-danger/80",
    edit: "bg-green-500 text-white hover:bg-green-600",
  };

  return (
    <button
      onClick={onClick || (() => {})}
      className={`px-4 py-2 rounded-md ${variantClasses[variant]} ${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""} flex items-center justify-center`}
      disabled={disabled}
      aria-label={ariaLabel || title}
    >
      {icon && (
        <span className="mr-2 flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      {children || title}
    </button>
  );
};

export default Button;
