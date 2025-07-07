import React from 'react';

const Footer: React.FC = () => (
  <footer className="w-full py-6 px-4 text-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border-t border-slate-200/80 dark:border-zinc-800/80 text-slate-500 dark:text-zinc-400 text-sm font-medium">
    &copy; {new Date().getFullYear()} Donut Bot. All rights reserved.
  </footer>
);

export default Footer; 