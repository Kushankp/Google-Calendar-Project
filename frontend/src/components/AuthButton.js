import React from 'react';
import '../AuthButton.css'; // Adding a CSS file for styling

function AuthButton({ onClick, disabled, text }) {
  return (
    <button 
      className={`auth-button ${disabled ? 'disabled' : ''}`} 
      onClick={onClick} 
      disabled={disabled}
      aria-label={text} /* Accessibility feature */
    >
      {text}
    </button>
  );
}

export default AuthButton;
