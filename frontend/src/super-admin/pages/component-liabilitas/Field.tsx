import type React from 'react';

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

export default function Field({ label, required, children }: FieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}{required && <span className="ml-0.5 text-rose-400">*</span>}
      </label>
      {children}
    </div>
  );
}
