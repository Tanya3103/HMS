import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import './AppLayout.css';

export function AppLayout({ children, currentTab, onTabChange }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Header onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
      <div className="app-body">
        <Sidebar
          currentTab={currentTab}
          onTabChange={onTabChange}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="app-main-canvas" id="main-content">
          <div className="canvas-container">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
