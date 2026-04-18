import React from 'react';

export const ColorTest: React.FC = () => {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Color System Test</h1>
      
      {/* Test standard Tailwind colors first */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Standard Tailwind Colors (Should Work)</h2>
        <div className="bg-white border border-gray-200 p-4 rounded-lg">
          <p className="text-gray-900">This should be dark gray text</p>
          <p className="text-gray-600">This should be medium gray text</p>
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Green Button
          </button>
        </div>
      </div>

      {/* Test custom colors */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Custom 60-30-10 Colors (Testing)</h2>
        <div className="bg-neutral-white border border-secondary-200 p-4 rounded-lg">
          <p className="text-secondary-900">This should use custom secondary-900</p>
          <p className="text-secondary-600">This should use custom secondary-600</p>
          <button className="bg-accent-600 text-neutral-white px-4 py-2 rounded hover:bg-accent-700">
            Custom Green Button
          </button>
        </div>
      </div>

      {/* Fallback test with inline styles */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">CSS Variables (Fallback)</h2>
        <div 
          style={{ 
            backgroundColor: 'var(--color-neutral-white, #FFFFFF)',
            border: '1px solid var(--color-secondary-200, #EEEEEE)',
            padding: '1rem',
            borderRadius: '0.5rem'
          }}
        >
          <p style={{ color: 'var(--color-secondary-900, #212121)' }}>
            This uses CSS variables directly
          </p>
          <button 
            style={{ 
              backgroundColor: 'var(--color-accent-600, #16A34A)',
              color: 'var(--color-neutral-white, #FFFFFF)',
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '0.25rem'
            }}
          >
            CSS Variable Button
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorTest;
