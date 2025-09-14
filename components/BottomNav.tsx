
import React from 'react';
import { Screen } from '../types';
import { FaHome, FaBook, FaChartBar, FaUsersCog } from 'react-icons/fa';

interface BottomNavProps {
    activeScreen: Screen;
    setActiveScreen: (screen: Screen) => void;
    availableScreens: Screen[]; // Receive the list of allowed screens
}

const screenIcons: Record<Screen, React.ReactElement> = {
    [Screen.OVERVIEW]: <FaHome />,
    [Screen.COURSE]: <FaBook />,
    [Screen.REPORT]: <FaChartBar />,
    [Screen.ADMIN]: <FaUsersCog />,
};

const NavItem: React.FC<{ 
    screen: Screen;
    icon: React.ReactElement;
    isActive: boolean;
    onClick: () => void;
}> = ({ screen, icon, isActive, onClick }) => (
    <button 
        onClick={onClick} 
        className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}>
        {React.cloneElement(icon, { className: 'w-6 h-6 mb-1' })}
        <span className="text-xs font-medium">{screen}</span>
    </button>
);

const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, setActiveScreen, availableScreens }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white shadow-top z-50">
            <div className="flex justify-around items-center h-full max-w-7xl mx-auto px-2">
                {/* Map over the availableScreens array to render nav items */}
                {availableScreens.map(screenName => (
                    <NavItem
                        key={screenName}
                        screen={screenName}
                        icon={screenIcons[screenName]}
                        isActive={activeScreen === screenName}
                        onClick={() => setActiveScreen(screenName)}
                    />
                ))}
            </div>
        </div>
    );
};

export default BottomNav;
