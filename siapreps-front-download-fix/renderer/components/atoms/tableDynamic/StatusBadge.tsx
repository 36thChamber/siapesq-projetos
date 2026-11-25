import React from 'react';


export interface StatusBadgeProps {

  label: string;

  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';

  size?: 'sm' | 'md' | 'lg';

  className?: string;
}


export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant,
  size = 'md',
  className = ''
}) => {

  const variantStyles = {
    success: 'bg-[var(--color-green_approved)] text-white',
    warning: 'bg-[var(--color-yellow_pedant)] text-[var(--color-dark_green)]',
    error: 'bg-[var(--color-red_failed)] text-white',
    info: 'bg-[var(--color-dark_green)] text-white',
    neutral: 'bg-gray-200 text-gray-700'
  };
  
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };
  
  return (
    <span
      className={`
        inline-flex items-center justify-center
        rounded-full font-poppins font-medium
        whitespace-nowrap
        max-w-full
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      role="status"
      aria-label={`Status: ${label}`}
    >
      <span 
        className="truncate"
        title={label}
      >
        {label}
      </span>
    </span>
  );
};

export default StatusBadge;
