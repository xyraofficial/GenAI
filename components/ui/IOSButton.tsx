import React from 'react';

interface IOSButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  isLoading?: boolean;
}

export const IOSButton: React.FC<IOSButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  isLoading = false,
  disabled,
  ...props 
}) => {
  
  const baseStyles = "w-full py-3.5 px-4 rounded-xl font-semibold text-[17px] transition-all duration-200 active:scale-[0.98] flex items-center justify-center";
  
  const variants = {
    primary: "bg-ios-blue text-white active:bg-blue-600 shadow-sm",
    secondary: "bg-gray-200 text-black active:bg-gray-300",
    destructive: "bg-ios-red text-white active:bg-red-600",
    ghost: "bg-transparent text-ios-blue hover:bg-blue-50/50"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${disabled || isLoading ? 'opacity-50 pointer-events-none' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  );
};
