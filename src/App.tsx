import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider, useProjects } from './context/ProjectContext';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { KanbanBoard } from './components/KanbanBoard';
import { ProfileModal } from './components/ProfileModal';
import { TeamLoungeChat } from './components/TeamLoungeChat';
import { Toaster } from 'react-hot-toast';

function MainAppShell() {
  const { user, loading } = useAuth();
  const { selectProject } = useProjects();
  
  const [currentView, setCurrentView] = useState<'dashboard' | 'board'>('dashboard');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Search/Filters centralized state passed to Navbar, Dashboard, and Board
  const [searchText, setSearchText] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-3 select-none relative">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none"></div>
        <svg className="animate-spin h-6 w-6 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-xs font-mono text-slate-400 tracking-wider uppercase font-bold">Synchronizing Arena Session...</span>
      </div>
    );
  }

  // Not authenticated? Show Login/Register view
  if (!user) {
    return authView === 'login' ? (
      <Login onToggleRegister={() => setAuthView('register')} />
    ) : (
      <Register onToggleLogin={() => setAuthView('login')} />
    );
  }

  // Secure authenticated layout frame with Glassmorphism ambient effects
  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 font-sans overflow-hidden select-none relative">
      
      {/* Background radial glows for premium refraction preview */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[130px] pointer-events-none z-0"></div>

      {/* Left panel */}
      <Sidebar
        currentView={currentView}
        onSelectNav={(view) => {
          setCurrentView(view);
          setSearchText('');
          setPriorityFilter('');
          setAssigneeFilter('');
        }}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      {/* Main body content section */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        
        {/* Navbar */}
        <Navbar
          searchText={searchText}
          onSearchChange={setSearchText}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          assigneeFilter={assigneeFilter}
          onAssigneeFilterChange={setAssigneeFilter}
          currentView={currentView}
          onOpenProfile={() => setShowProfileModal(true)}
        />

        {/* Workspace Display view */}
        <main className="flex-1 overflow-hidden relative">
          {currentView === 'dashboard' ? (
            <Dashboard
              searchText={searchText}
              onSelectProject={(id) => selectProject(id)}
              onSelectNav={(view) => setCurrentView(view)}
            />
          ) : (
            <KanbanBoard
              searchText={searchText}
              priorityFilter={priorityFilter}
              assigneeFilter={assigneeFilter}
            />
          )}
        </main>

      </div>

      {/* Team Lounge Chat Drawer component */}
      <TeamLoungeChat />

      {/* Profile Settings Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <MainAppShell />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #1e293b',
              fontSize: '12px',
              fontFamily: '"Inter", sans-serif',
              borderRadius: '12px',
            },
          }}
        />
      </ProjectProvider>
    </AuthProvider>
  );
}
