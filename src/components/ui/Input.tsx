import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface BaseProps {
  label?: string;
  error?: string;
  helperText?: string;
}

type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement> & {
  as?: 'input';
};

type TextareaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement> & {
  as: 'textarea';
};

type Props = InputProps | TextareaProps;

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, Props>(
  ({ label, error, helperText, className, id, as = 'input', ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const Component = as;
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-2">
            {label}
          </label>
        )}
        <Component
          ref={ref as any}
          id={inputId}
          className={cn(
            'w-full px-4 py-3 border rounded-lg text-base',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            'transition-all',
            error ? 'border-red-500' : 'border-slate-300',
            as === 'textarea' && 'resize-none',
            className
          )}
          {...(props as any)}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-2 text-sm text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
