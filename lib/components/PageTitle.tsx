import React from 'react';

interface PageTitleProps {
  title: string;
  size?: 'small' | 'medium' | 'large';
}

const PageTitle: React.FC<PageTitleProps> = ({ title, size = 'medium' }) => {
  const sizeClasses = {
    small: 'text-2xl',
    medium: 'text-4xl',
    large: 'text-6xl',
  };

  return (
    <h1 className={`font-bold mb-8 text-center ${sizeClasses[size]}`}>
      {title}
    </h1>
  );
};

export default PageTitle;
