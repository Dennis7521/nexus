import { motion } from "motion/react";

export default function App() {
  return (
    <div className="size-full bg-[#1e7a46]">
      {/* Navigation Header */}
      <header className="px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo Placeholder */}
          <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center text-white text-xs">
            LOGO
          </div>
          <span className="text-white text-2xl font-bold tracking-wide">NEXUS</span>
        </div>

        <nav className="flex items-center gap-8">
          <a href="#" className="text-white hover:opacity-80">Home</a>
          <a href="#" className="text-white hover:opacity-80">About Us</a>
          <button className="px-6 py-2 border-2 border-white text-white rounded hover:bg-white hover:text-[#1e7a46] transition-colors">
            Login
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="px-8 py-16 flex items-center gap-12">
        {/* Left Content */}
        <div className="flex-1 max-w-xl">
          <h1 className="text-white text-5xl font-bold leading-tight mb-6">
            The premier platform for skill exchange and peer learning
          </h1>

          <p className="text-white text-lg mb-8 leading-relaxed">
            A premium non-monetary ecosystem where your expertise is the only currency you will ever need! Designed for the ambitious student! powered by graph intelligence.
          </p>

          <div className="flex items-center gap-6">
            <button className="px-8 py-3 bg-white text-[#1e7a46] font-semibold rounded-full hover:bg-gray-100 transition-colors">
              REGISTER NOW
            </button>

            {/* Animated Network Icon */}
            <div className="relative w-24 h-24">
              {/* Center node */}
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-3 h-3 bg-white rounded-full" />
              </motion.div>

              {/* Top user icon */}
              <motion.div
                className="absolute left-1/2 top-0 -translate-x-1/2"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0 }}
              >
                <div className="w-8 h-8 bg-[#FF6B6B] rounded-full flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5" r="3" fill="white"/>
                    <path d="M3 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="white" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
              </motion.div>

              {/* Bottom-left user icon */}
              <motion.div
                className="absolute left-2 bottom-2"
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.66 }}
              >
                <div className="w-8 h-8 bg-[#4169E1] rounded-full flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5" r="3" fill="white"/>
                    <path d="M3 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="white" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
              </motion.div>

              {/* Bottom-right user icon */}
              <motion.div
                className="absolute right-2 bottom-2"
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1.33 }}
              >
                <div className="w-8 h-8 bg-[#FFA500] rounded-full flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5" r="3" fill="white"/>
                    <path d="M3 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="white" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
              </motion.div>

              {/* Connection lines */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 96 96">
                <motion.line
                  x1="48" y1="16" x2="48" y2="48"
                  stroke="white"
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
                <motion.line
                  x1="48" y1="48" x2="20" y2="72"
                  stroke="white"
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.5 }}
                />
                <motion.line
                  x1="48" y1="48" x2="76" y2="72"
                  stroke="white"
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 1 }}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 relative flex items-center justify-center">
          {/* Hero Image Placeholder */}
          <div className="relative">
            <div className="w-[480px] h-[380px] bg-white/20 rounded-[100px] flex items-center justify-center text-white text-sm">
              HERO IMAGE
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}