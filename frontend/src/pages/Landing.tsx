import { Link } from 'react-router-dom';

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="px-8 py-4 flex items-center justify-between" style={{ background: '#1e7a46' }}>
        <div className="flex items-center gap-4">
          <img 
            src="/images/node.png" 
            alt="NEXUS Logo" 
            className="w-16 h-16 object-contain"
          />
          <span className="text-white text-3xl font-bold tracking-wide">NEXUS</span>
        </div>

        <nav className="flex items-center gap-8">
          <Link to="/" className="text-white hover:opacity-80 transition-opacity">
            Home
          </Link>
          <Link to="/about" className="text-white hover:opacity-80 transition-opacity">
            About Us
          </Link>
          <Link
            to="/login"
            className="px-6 py-2 border-2 border-white text-white rounded hover:bg-white transition-all duration-300 hover:-translate-y-1 hover:scale-105"
            style={{ 
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#1e7a46'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
          >
            Login
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="px-14 py-6 flex items-center gap-6 bg-white">
        {/* Left Content */}
        <div className="flex-1 max-w-xl">
          <h1 className="text-gray-900 text-4xl font-bold leading-tight mb-8">
            The premier platform for skill exchange and peer learning
          </h1>

          <p className="text-gray-700 text-lg mb-8 leading-relaxed">
            A premium non-monetary ecosystem where your expertise is the only currency you will ever need! Designed for the ambitious student! powered by graph intelligence.
          </p>

          <div className="flex items-center gap-6">
            <Link
              to="/register"
              className="px-8 py-3 font-semibold rounded-full transition-all duration-300 hover:-translate-y-1 hover:scale-105"
              style={{ 
                background: '#1e7a46',
                color: 'white',
                boxShadow: '0 10px 30px rgba(30, 122, 70, 0.3)'
              }}
            >
              REGISTER NOW
            </Link>

            {/* Animated Network Icon */}
            <div className="relative w-32 h-24 ml-5">
              {/* Center node */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: '#1e7a46' }} />
              </div>

              {/* Top user icon */}
              <div className="absolute left-1/2 top-0 -translate-x-1/2 animate-bounce">
                <div className="w-8 h-8 bg-[#FF6B6B] rounded-full flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5" r="3" fill="white"/>
                    <path d="M3 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="white" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
              </div>

              {/* Bottom-left user icon */}
              <div className="absolute left-2 bottom-2 animate-bounce" style={{ animationDelay: '0.66s' }}>
                <div className="w-8 h-8 bg-[#4169E1] rounded-full flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5" r="3" fill="white"/>
                    <path d="M3 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="white" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
              </div>

              {/* Bottom-right user icon */}
              <div className="absolute right-2 bottom-2 animate-bounce" style={{ animationDelay: '1.33s' }}>
                <div className="w-8 h-8 bg-[#FFA500] rounded-full flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5" r="3" fill="white"/>
                    <path d="M3 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="white" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
              </div>

              {/* Connection lines */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 96 96">
                <line x1="48" y1="16" x2="48" y2="48" stroke="#1e7a46" strokeWidth="2" opacity="0.5" />
                <line x1="48" y1="48" x2="20" y2="72" stroke="#1e7a46" strokeWidth="2" opacity="0.5" />
                <line x1="48" y1="48" x2="76" y2="72" stroke="#1e7a46" strokeWidth="2" opacity="0.5" />
              </svg>
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 relative flex items-center justify-center">
          <div className="relative">
            <div 
              className="overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:scale-105"
              style={{ 
                width: '600px',
                height: '480px',
                borderRadius: '120px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
              }}
            >
              <img 
                src="/images/registration-hero.jpg" 
                alt="Students learning together" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
