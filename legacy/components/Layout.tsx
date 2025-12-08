
import React from 'react';
import { BookOpen, LayoutDashboard, FileText, Brain, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'documents' | 'quiz';
  onNavigate: (tab: 'dashboard' | 'documents' | 'quiz') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onNavigate }) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 z-10">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-slate-800 tracking-tight">StudyGenius</span>
        </div>
        
        <nav className="p-4 space-y-2">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dashboard' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          
          <button
            onClick={() => onNavigate('documents')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'documents' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <FileText className="w-5 h-5" />
            Documents
          </button>

          <div className="pt-4 mt-4 border-t border-slate-100">
             <div className="px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img src={user?.avatar} alt={user?.name} className="w-8 h-8 rounded-full border border-slate-200" />
                    <div className="text-xs">
                        <p className="font-bold text-slate-800">{user?.name}</p>
                        <p className="text-slate-500 truncate max-w-[80px]">{user?.email}</p>
                    </div>
                </div>
             </div>
             <button 
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors mt-2"
             >
                <LogOut className="w-5 h-5" />
                Sign Out
             </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto h-screen">
        <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-20 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-slate-800 capitalize">
            {activeTab}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Gemini 2.5 Active
            </div>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
