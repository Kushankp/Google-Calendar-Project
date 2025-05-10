import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import QRCodeGenerator from './components/QRCodeGenerator';
import GoogleCalendar from './components/GoogleCalendar';
import Layout from './components/Layout';
import Calendar from './components/Calender';
import InfoNote from './components/InfoNote'; // Import the InfoNote component
import './App.css'; 

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<QRCodeGenerator />} />
          <Route path="/google-calendar" element={<GoogleCalendar />} />
          <Route path="/calendar" element={<Calendar />} />
        </Routes>
        <InfoNote/>
      </Layout>
    </Router>
  );
}

export default App;
