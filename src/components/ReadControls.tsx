import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb as fasLightbulb } from '@fortawesome/free-solid-svg-icons';
import { faLightbulb as farLightbulb } from '@fortawesome/free-regular-svg-icons';

interface ReadControlsProps {
    fontSize: number;
    setSize: (size: number) => void;
    darkMode: boolean;
    toggleDarkMode: () => void;
}

const ReadControls: React.FC<ReadControlsProps> = ({ fontSize, setSize, darkMode, toggleDarkMode }) => {
    const increment = 2;
    const btnClass = "bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg transition-colors flex items-center justify-center backdrop-blur-sm cursor-pointer border-none";

    return (
        <div className="flex items-center gap-2">
            <button 
                className={`${btnClass} w-8 h-8 text-sm`} 
                onClick={() => setSize(Math.max(12, fontSize - increment))}
                aria-label="Decrease font size"
            >
                A
            </button>
            <button 
                className={`${btnClass} w-10 h-10 text-lg`} 
                onClick={() => setSize(Math.min(32, fontSize + increment))}
                aria-label="Increase font size"
            >
                A
            </button>
            <button 
                className={`${btnClass} w-10 h-10`} 
                onClick={toggleDarkMode}
                aria-label="Toggle dark mode"
            >
                <FontAwesomeIcon icon={darkMode ? fasLightbulb : farLightbulb} />
            </button>
        </div>
    );
};

export default ReadControls;
