import React from 'react';

interface AoaLogoProps {
  size?: number;
  className?: string;
}

export function AoaLogo({ size = 40, className = '' }: AoaLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 320 320" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="320" height="320" rx="80" fill="#0F172A"/>
      <circle cx="160" cy="160" r="50" stroke="#F8FAFC" strokeWidth="20"/>
      <path d="M110 160L210 160" stroke="#F8FAFC" strokeWidth="20" strokeLinecap="round"/>
      <path d="M160 110L160 210" stroke="#F8FAFC" strokeWidth="20" strokeLinecap="round"/>
      <circle cx="160" cy="160" r="18" fill="#2DD4BF"/>
    </svg>
  );
}
