import React, { useState, useEffect } from 'react';

export default function LandingScreen({ onEnter }) {
  const [showButton, setShowButton] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Fade in the enter button after a short delay so the user watches the intro
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleEnterClick = () => {
    setIsTransitioning(true);
    // Wait for the circle shape animation to fill the screen (800ms) before navigating
    setTimeout(() => {
      onEnter();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center overflow-hidden">
      {/* Background Video (YouTube Embed for repo size optimization) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 opacity-80 pointer-events-none">
        <iframe
          className="absolute top-1/2 left-1/2 w-[110vw] h-[110vh] -translate-x-1/2 -translate-y-1/2 object-cover"
          src="https://www.youtube.com/embed/uAISeuW0wpc?autoplay=1&mute=1&controls=0&loop=1&playlist=uAISeuW0wpc&showinfo=0&modestbranding=1&iv_load_policy=3&rel=0&disablekb=1&enablejsapi=1"
          frameBorder="0"
          allow="autoplay; encrypted-media"
          allowFullScreen
        ></iframe>
      </div>
      
      {/* Dark Gradient Overlay for better contrast */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-transparent to-transparent opacity-90"></div>

      {/* Foreground Content */}
      <div className={`absolute bottom-20 z-20 transition-all duration-1000 transform ${showButton && !isTransitioning ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <button 
          onClick={handleEnterClick}
          className="bg-primary text-on-primary px-10 py-4 rounded-full text-lg font-bold hover:bg-primary/90 transition-all active:scale-95 shadow-[0_10px_30px_rgba(1,105,111,0.4)] flex items-center gap-3 backdrop-blur-md"
        >
          Enter Platform <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>

      {/* Shape Transition Overlay */}
      <div 
        className="pointer-events-none absolute z-50 rounded-full"
        style={{
          top: 'calc(100% - 112px)', // Align with the button's vertical position
          left: '50%',
          width: '100px',
          height: '100px',
          marginTop: '-50px',
          marginLeft: '-50px',
          backgroundColor: '#0a1012', // Matches tailwind 'bg-background' deep earth
          transform: isTransitioning ? 'scale(60)' : 'scale(0)',
          transition: 'transform 0.8s cubic-bezier(0.7, 0, 0.3, 1)',
        }}
      ></div>
    </div>
  );
}
