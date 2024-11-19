import React, { ReactNode } from "react";

interface IconCounterProps {
  count: number;
  icon: ReactNode;
  label?: string;
}

const IconCounter: React.FC<IconCounterProps> = ({ count, icon, label }) => {
  return (
    <div className="flex items-center gap-1">
      {icon}
      <span>{count}</span>
      {label && <span>{label}</span>}
    </div>
  );
};

export default IconCounter;
