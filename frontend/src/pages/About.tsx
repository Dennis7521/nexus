import { Link } from 'react-router-dom';

export const About: React.FC = () => {
  return (
    <div className="min-h-screen" style={{ background: '#1e7a46' }}>
      {/* Navigation Header */}
      <header className="px-8 py-4 flex items-center justify-between">
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
          <a href="#about" className="text-white hover:opacity-80 transition-opacity">
            About Us
          </a>
          <Link
            to="/login"
            className="px-6 py-2 border-2 border-white text-white rounded hover:bg-white transition-colors"
            style={{ 
              '&:hover': { color: '#1e7a46' }
            } as any}
            onMouseEnter={(e) => e.currentTarget.style.color = '#1e7a46'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
          >
            Login
          </Link>
        </nav>
      </header>

      {/* About Content */}
      <main className="px-8 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-16">
            <h1 className="text-white text-5xl font-bold mb-4">About NEXUS</h1>
            <p className="text-white text-xl">Empowering students through skill exchange</p>
          </div>

          {/* Mission Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-12 mb-8">
            <h2 className="text-white text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-white text-lg leading-relaxed mb-4">
              NEXUS is a revolutionary platform designed to foster peer-to-peer learning and skill exchange 
              within academic communities. We believe that every student has valuable knowledge to share, 
              and that the best way to learn is by teaching others.
            </p>
            <p className="text-white text-lg leading-relaxed">
              Our non-monetary ecosystem eliminates financial barriers, making education accessible to all. 
              Your expertise becomes your currency, creating a truly equitable learning environment.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-3 gap-8 mb-8">
            {/* Feature 1 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1e7a46" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="text-white text-xl font-bold mb-3">Peer Learning</h3>
              <p className="text-white text-sm">
                Connect with fellow students to exchange knowledge and skills in a collaborative environment.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1e7a46" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <h3 className="text-white text-xl font-bold mb-3">Time Banking</h3>
              <p className="text-white text-sm">
                Earn credits by teaching your skills and spend them learning from others. Fair and balanced.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1e7a46" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3 className="text-white text-xl font-bold mb-3">Graph Intelligence</h3>
              <p className="text-white text-sm">
                Smart matching algorithms connect you with the right peers based on skills and interests.
              </p>
            </div>
          </div>

          {/* Values Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-12">
            <h2 className="text-white text-3xl font-bold mb-6">Our Values</h2>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-white text-xl font-bold mb-3">🤝 Collaboration</h3>
                <p className="text-white text-base">
                  We believe in the power of working together and sharing knowledge freely.
                </p>
              </div>
              <div>
                <h3 className="text-white text-xl font-bold mb-3">⚖️ Equity</h3>
                <p className="text-white text-base">
                  Everyone has something valuable to offer, regardless of their background.
                </p>
              </div>
              <div>
                <h3 className="text-white text-xl font-bold mb-3">🎓 Growth</h3>
                <p className="text-white text-base">
                  Continuous learning and personal development are at the heart of what we do.
                </p>
              </div>
              <div>
                <h3 className="text-white text-xl font-bold mb-3">🌍 Community</h3>
                <p className="text-white text-base">
                  Building strong, supportive networks that last beyond the classroom.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center mt-16">
            <h2 className="text-white text-3xl font-bold mb-6">Ready to Join?</h2>
            <p className="text-white text-lg mb-8">
              Start your journey with NEXUS today and unlock the power of peer learning.
            </p>
            <Link
              to="/register"
              className="inline-block px-12 py-4 bg-white font-bold text-lg rounded-full hover:bg-gray-100 transition-colors"
              style={{ color: '#1e7a46' }}
            >
              GET STARTED
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
