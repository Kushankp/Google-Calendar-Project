import React from 'react';

function Layout({ children }) {
  return (
    <div className="App">


      {/* Content Area */}
      <div className="content-wrapper">
      <h1>
        <span className="Google-logo">S</span>
        <span className="Google-logo-red">Y</span>
        <span className="Google-logo-yellow">N</span>
        <span className="Google-logo">C</span>
        <span className="Google-logo-green">M</span>
        <span className="Google-logo-red">E</span>
        <span className="Google-logo">E</span>
        <span className="Google-logo-yellow">T</span>
      </h1>
        {children}
      </div>
    </div>
  );
}

export default Layout;
