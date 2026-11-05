import React from 'react';
import { NavLink } from 'react-router-dom';
import { HiHome } from 'react-icons/hi';
import { FaFire, FaMusic, FaSlidersH, FaCompass } from 'react-icons/fa';

const mobileTabs = [
  { name: 'Home', to: '/', icon: HiHome },
  { name: 'Explore', to: '/explore', icon: FaCompass },
  { name: 'Charts', to: '/charts', icon: FaFire },
  { name: 'Library', to: '/library', icon: FaMusic },
];

const MobileNav = () => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 theme-bg-main/95 backdrop-blur-xl border-t theme-border px-2 py-1.5 flex items-center justify-around select-none">
      {mobileTabs.map((tab) => (
        <NavLink
          key={tab.name}
          to={tab.to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 ${
              isActive
                ? 'text-rose-600 font-bold scale-105'
                : 'theme-text-muted hover:theme-text-main font-medium'
            }`
          }
        >
          <tab.icon className="text-lg mb-0.5" />
          <span className="text-[10px] tracking-tight">{tab.name}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default MobileNav;
