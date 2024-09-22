import React, { ReactNode } from 'react';

interface ButtonProps {
  title: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'edit';
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  icon,
}) => {
  const variantClasses = {
    primary: 'bg-teal text-white hover:bg-teal/80',
    secondary: 'bg-gray-300 text-gray-800 hover:bg-gray-400',
    danger: 'bg-danger text-white hover:bg-danger/80',
    edit: 'bg-green-500 text-white hover:bg-green-600',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md ${variantClasses[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} flex items-center justify-center`}
      disabled={disabled}
    >
      {icon && <span className="mr-2 flex-shrink-0">{icon}</span>}
      <span>{title}</span>
    </button>
  );
};

export default Button;
