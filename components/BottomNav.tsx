// File: components/BottomNav.tsx

import React from 'react';
import { Screen } from '../types';

import { 
    FaHome, 
    FaBook, 
    FaChartBar, 
    FaUsersCog,
} from 'react-icons/fa';

const screenIcons: Record<string, React.ElementType> = {
    [Screen.OVERVIEW]: FaHome,
    [Screen.COURSES]: FaBook,
    [Screen.REPORTS]: FaChartBar,
    [Screen.MANAGEMENT]: FaUsersCog,
};

interface NavItemProps {
    Icon: React.ElementType;
    label: string;
    isActive: boolean;
    onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ Icon, label, isActive, onClick }) => {
    const activeClasses = 'bg-primary text-white';
    const inactiveClasses = 'text-gray-600 hover:bg-primary-light hover:text-white';

    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses}`}
        >
            <Icon className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">{label}</span>
        </button>
    );
};

interface BottomNavProps {
    activeScreen: Screen;
    setActiveScreen: (screen: Screen) => void;
    availableScreens: Screen[];
}

const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, setActiveScreen, availableScreens }) => {
    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-white shadow-lg z-50">
            <div className="flex justify-around max-w-7xl mx-auto">
                {availableScreens.map((screen) => {
                    const IconComponent = screenIcons[screen];
                    
                    if (!IconComponent) {
                        return null; 
                    }

                    return (
                        <NavItem
                            key={screen} 
                            Icon={IconComponent}
                            label={screen}
                            isActive={activeScreen === screen}
                            onClick={() => setActiveScreen(screen)}
                        />
                    );
                })}
            </div>
        </footer>
    );
};

export default BottomNav;