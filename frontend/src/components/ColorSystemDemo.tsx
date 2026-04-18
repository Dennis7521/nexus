import React from 'react';

/**
 * Color System Demo Component
 * Demonstrates the 60-30-10 color rule implementation
 * This component can be used as a reference for proper color usage
 */
export const ColorSystemDemo: React.FC = () => {
  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-secondary-900 mb-2">
          NEXUS 60-30-10 Color System
        </h1>
        <p className="text-secondary-600">
          Demonstrating proper color usage across the platform
        </p>
      </div>

      {/* 60% Neutral - Backgrounds */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-secondary-800">
          60% Neutral (White Base)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-neutral-white border border-secondary-200 rounded-xl p-6">
            <h3 className="font-medium text-secondary-900 mb-2">Primary Background</h3>
            <p className="text-secondary-600 text-sm">
              Main content areas, page backgrounds, card surfaces
            </p>
            <code className="text-xs text-secondary-500 bg-secondary-50 px-2 py-1 rounded mt-2 block">
              bg-neutral-white
            </code>
          </div>
        </div>
      </section>

      {/* 30% Secondary - Text and Surfaces */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-secondary-800">
          30% Secondary (Off-white/Light Gray)
        </h2>
        <div className="bg-neutral-white border border-secondary-200 rounded-xl p-6 space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-secondary-900">Primary Text</h3>
            <h4 className="text-base font-medium text-secondary-800">Secondary Heading</h4>
            <p className="text-secondary-700">Important body text content</p>
            <p className="text-secondary-600">Regular body text and descriptions</p>
            <p className="text-secondary-500">Secondary information and metadata</p>
          </div>
          
          <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4">
            <p className="text-secondary-700 text-sm">
              Surface background with proper contrast
            </p>
          </div>
        </div>
      </section>

      {/* 10% Accent - Green Highlights */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-secondary-800">
          10% Accent (Green)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Primary Button */}
          <button className="bg-accent-600 text-neutral-white hover:bg-accent-700 px-4 py-2 rounded-xl font-medium transition-colors">
            Primary Action
          </button>
          
          {/* Success Badge */}
          <div className="bg-accent-50 text-accent-700 border border-accent-200 px-3 py-2 rounded-full text-sm font-medium text-center">
            Success State
          </div>
          
          {/* Skill Offer Badge */}
          <div className="bg-accent-100 text-accent-700 px-3 py-1 rounded-xl text-xs font-semibold uppercase tracking-wide text-center">
            Skill Offer
          </div>
          
          {/* Online Status */}
          <div className="flex items-center gap-2 bg-secondary-50 px-3 py-2 rounded-lg">
            <div className="w-2 h-2 bg-accent-500 rounded-full"></div>
            <span className="text-accent-600 text-sm font-medium">Online</span>
          </div>
        </div>
      </section>

      {/* Form Elements */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-secondary-800">
          Form Elements
        </h2>
        <div className="bg-neutral-white border border-secondary-200 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Input Field
            </label>
            <input 
              type="text" 
              placeholder="Enter text here..."
              className="w-full px-4 py-3 border border-secondary-200 rounded-xl text-secondary-900 bg-neutral-white focus:border-accent-500 focus:ring-2 focus:ring-accent-100 transition-all"
            />
          </div>
          
          <div className="flex gap-3">
            <button className="bg-accent-600 text-neutral-white hover:bg-accent-700 px-4 py-2 rounded-xl font-medium transition-colors">
              Submit
            </button>
            <button className="bg-secondary-100 text-secondary-700 hover:bg-secondary-200 border border-secondary-200 px-4 py-2 rounded-xl font-medium transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </section>

      {/* Skill Card Example */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-secondary-800">
          Skill Card Example
        </h2>
        <div className="bg-neutral-white border border-secondary-200 rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-secondary-900">React.js Fundamentals</h3>
              <p className="text-secondary-600 text-sm">Learn React hooks, components, and state management</p>
            </div>
            <div className="bg-accent-50 text-accent-700 border border-accent-200 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
              Offer
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-secondary-500">
              <span>⏱️ 2 hours/week</span>
              <span>👥 2/3 students</span>
              <span>📊 Beginner</span>
            </div>
            <button className="bg-accent-600 text-neutral-white hover:bg-accent-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Apply Now
            </button>
          </div>
        </div>
      </section>

      {/* Color Palette Reference */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-secondary-800">
          Color Palette Reference
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Neutral Colors */}
          <div className="space-y-2">
            <h3 className="font-medium text-secondary-900">Neutral (60%)</h3>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-neutral-white border border-secondary-300 rounded"></div>
                <span className="text-xs text-secondary-600">neutral-white</span>
              </div>
            </div>
          </div>
          
          {/* Secondary Colors */}
          <div className="space-y-2">
            <h3 className="font-medium text-secondary-900">Secondary (30%)</h3>
            <div className="space-y-1">
              {[50, 100, 200, 500, 600, 700, 800, 900].map(shade => (
                <div key={shade} className="flex items-center gap-2">
                  <div className={`w-4 h-4 bg-secondary-${shade} rounded`}></div>
                  <span className="text-xs text-secondary-600">secondary-{shade}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Accent Colors */}
          <div className="space-y-2">
            <h3 className="font-medium text-secondary-900">Accent (10%)</h3>
            <div className="space-y-1">
              {[50, 100, 200, 500, 600, 700].map(shade => (
                <div key={shade} className="flex items-center gap-2">
                  <div className={`w-4 h-4 bg-accent-${shade} rounded`}></div>
                  <span className="text-xs text-secondary-600">accent-{shade}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ColorSystemDemo;
