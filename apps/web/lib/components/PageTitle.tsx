import React from "react";

interface PageTitleProps {
  title: string;
  size?: "small" | "medium" | "large";
  alignment?: "left" | "center" | "right";
}

const PageTitle: React.FC<PageTitleProps> = ({ 
  title, 
  size = "medium",
  alignment = "center"
}) => {
  const sizeClasses = {
    small: "text-2xl",
    medium: "text-4xl",
    large: "text-6xl",
  };

  const alignmentClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <h1 className={`font-bold mb-8 ${sizeClasses[size]} ${alignmentClasses[alignment]}`}>
      {title}
    </h1>
  );
};

export default PageTitle;
