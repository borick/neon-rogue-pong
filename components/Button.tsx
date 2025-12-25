
import React from 'react';
import { SoundSystem } from '../audio';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  onClick,
  onMouseEnter,
  ...props 
}) => {
  const baseStyles = "relative font-bold uppercase tracking-widest transition-all duration-300 transform active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed border-2 retro-font overflow-hidden group";
  
  const variants = {
    primary: "border-cyan-500 bg-cyan-900/20 text-cyan-400 hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]",
    secondary: "border-emerald-500 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-500 hover:text-black hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]",
    danger: "border-red-500 bg-red-900/20 text-red-400 hover:bg-red-500 hover:text-black hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]",
  };
  
  const sizes = {
    sm: "px-6 py-2 text-[10px]",
    md: "px-10 py-4 text-xs",
    lg: "px-14 py-5 text-sm",
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    SoundSystem.playUiHover();
    onMouseEnter?.(e);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    SoundSystem.playUiClick();
    onClick?.(e);
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 w-full h-full bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
    </button>
  );
};
