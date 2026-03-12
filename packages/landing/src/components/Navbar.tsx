'use client';

import React from 'react';
import { AoaLogo } from './AoaLogo';

export function Navbar() {
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur border-b border-border/40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AoaLogo size={32} />
          <span className="font-bold text-xl tracking-tight">AOA</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <a 
            href="#stack" 
            onClick={(e) => scrollToSection(e, 'stack')}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Stack
          </a>
          <a 
            href="#pipeline" 
            onClick={(e) => scrollToSection(e, 'pipeline')}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Pipeline
          </a>
          <a 
            href="#partners" 
            onClick={(e) => scrollToSection(e, 'partners')}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Partners
          </a>
          <a 
            href="#docs" 
            onClick={(e) => scrollToSection(e, 'docs')}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Docs
          </a>
        </div>

        <div className="flex items-center">
          <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors">
            Get Early Access
          </button>
        </div>
      </div>
    </nav>
  );
}
