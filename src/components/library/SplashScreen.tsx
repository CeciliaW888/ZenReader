import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
    onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Show splash for 2.5 seconds total
        // Start fading out at 2.0s
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onFinish, 500); // Wait for fade out transition
        }, 2000);

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex flex-col items-center animate-bounce">
                {/* Exact match to Navbar icon, scaled up (w-32 h-32 instead of w-10 h-10) */}
                <div className="w-32 h-32 mb-6">
                    <img src="/logo.svg" alt="ZenReader Logo" className="w-full h-full object-contain shadow-2xl shadow-emerald-200 rounded-[2.5rem]" />
                </div>
                <h1 className="text-4xl font-serif font-bold text-emerald-900 tracking-tight">
                    ZenReader
                </h1>
            </div>

            <div className="absolute bottom-12 text-zinc-500 font-medium text-sm tracking-wide">
                Bring knowledge to your fingertips
            </div>
        </div>
    );
};
