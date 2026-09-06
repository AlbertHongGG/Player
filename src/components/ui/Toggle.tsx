import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  className = "",
  disabled = false,
}) => {
  return (
    <button
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 ${
        disabled
          ? "cursor-not-allowed opacity-50 bg-gray-600"
          : checked
          ? "bg-[#facc15] shadow-[0_0_15px_rgba(250,204,21,0.3)] cursor-pointer"
          : "bg-gray-600 cursor-pointer"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
};
