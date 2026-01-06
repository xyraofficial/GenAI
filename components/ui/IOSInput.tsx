import React from 'react';

interface IOSInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const IOSInput: React.FC<IOSInputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full mb-4">
      {label && <label className="block text-sm font-medium text-gray-500 mb-1.5 ml-1">{label}</label>}
      <input
        className={`w-full bg-white border border-gray-200 text-gray-900 text-[17px] rounded-xl focus:ring-2 focus:ring-ios-blue focus:border-transparent block w-full p-3.5 outline-none transition-shadow ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-ios-red ml-1">{error}</p>}
    </div>
  );
};
