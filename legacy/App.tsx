
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { FileUpload } from './components/FileUpload';
import { QuizConfig } from './components/QuizConfig';
import { QuizPlayer } from './components/QuizPlayer';
import { QuizResults } from './components/QuizResults';
import { ToastProvider, useToast } from './components/ui/Toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/auth/Login';
import { SignUp } from './components/auth/SignUp';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { DocumentMeta, Quiz, QuizAttempt, QuizMode, QuizSettings } from './types';
import { GeminiService } from './services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { FileText, ArrowUpRight, Clock, Target, Archive, Trash2, AlertCircle } from 'lucide-react';

// --- Protected Route ---
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return children;
};

// --- Main App Logic (extracted) ---
const DashboardLayout = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'documents' | 'quiz' | 'results'>('dashboard');
    const [activeDocument, setActiveDocument] = useState<DocumentMeta | null>(null);
    const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
    const [completedAttempt, setCompletedAttempt] = useState<QuizAttempt | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Persistence State
    const [attempts, setAttempts] = useState<QuizAttempt[]>(() => {
        const saved = localStorage.getItem('attempts');
        return saved ? JSON.parse(saved) : [];
    });
    const [documents, setDocuments] = useState<DocumentMeta[]>(() => {
        const saved = localStorage.getItem('documents');
        return saved ? JSON.parse(saved) : [];
    });
    const [quizzes, setQuizzes] = useState<Quiz[]>(() => {
        const saved = localStorage.getItem('quizzes');
        return saved ? JSON.parse(saved) : [];
    });

    // Effects for persistence
    useEffect(() => { localStorage.setItem('attempts', JSON.stringify(attempts)); }, [attempts]);
    useEffect(() => { localStorage.setItem('documents', JSON.stringify(documents)); }, [documents]);
    useEffect(() => { localStorage.setItem('quizzes', JSON.stringify(quizzes)); }, [quizzes]);

    const handleNavigate = (tab: 'dashboard' | 'documents' | 'quiz') => {
        setActiveTab(tab);
        if (tab !== 'quiz') setActiveQuiz(null);
    };

    const handleDocumentProcessed = (doc: DocumentMeta) => {
        setDocuments(prev => [doc, ...prev]);
        setActiveDocument(doc);
        setActiveTab('documents');
    };

    const handleDeleteDocument = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this document?')) {
            setDocuments(prev => prev.filter(d => d.id !== id));
            if (activeDocument?.id === id) setActiveDocument(null);
            showToast('Document deleted', 'info');
        }
    }

    const handleArchiveAttempt = (id: string) => {
        setAttempts(prev => prev.map(a => a.id === id ? { ...a, isArchived: true } : a));
        showToast('Quiz attempt archived', 'success');
    }

    const handleStartQuiz = async (mode: QuizMode, settings: QuizSettings, title: string) => {
        if (!activeDocument) return;
        setIsGenerating(true);
        try {
            const questions = await GeminiService.generateQuiz(activeDocument.base64Data, mode, settings);
            const newQuiz: Quiz = {
                id: crypto.randomUUID(),
                title: title || `${mode.charAt(0).toUpperCase() + mode.slice(1)} Quiz: ${activeDocument.name}`,
                mode,
                questions,
                createdAt: new Date().toISOString(),
                fileName: activeDocument.name
            };
            setQuizzes(prev => [...prev, newQuiz]);
            setActiveQuiz(newQuiz);
            setActiveTab('quiz');
        } catch (error) {
            showToast("Failed to generate quiz. Please try again.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleQuizComplete = (attempt: QuizAttempt) => {
        setAttempts(prev => [attempt, ...prev]);
        setCompletedAttempt(attempt);
        setActiveTab('results');
    };

    const renderDashboard = () => {
        const activeAttempts = attempts.filter(a => !a.isArchived);
        const avgScore = activeAttempts.length > 0 
            ? Math.round(activeAttempts.reduce((acc, curr) => acc + curr.score, 0) / activeAttempts.length) 
            : 0;
        
        const performanceData = [
            { name: 'Correct', value: avgScore, color: '#22c55e' },
            { name: 'Incorrect', value: 100 - avgScore, color: '#f87171' }
        ];

        const chartData = [...activeAttempts].reverse().map(a => ({
            name: new Date(a.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            score: Math.round(a.score)
        }));

        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Stats Cards */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Target className="w-6 h-6" /></div>
                            <div><p className="text-sm text-slate-500 font-medium">Avg Score</p><h3 className="text-2xl font-bold text-slate-800">{avgScore}%</h3></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><FileText className="w-6 h-6" /></div>
                            <div><p className="text-sm text-slate-500 font-medium">Active Quizzes</p><h3 className="text-2xl font-bold text-slate-800">{activeAttempts.length}</h3></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 text-green-600 rounded-xl"><Clock className="w-6 h-6" /></div>
                            <div><p className="text-sm text-slate-500 font-medium">Time Invested</p><h3 className="text-2xl font-bold text-slate-800">{Math.round(activeAttempts.reduce((acc, c) => acc + c.timeSpent, 0) / 60)} m</h3></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Charts */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80">
                        <h3 className="font-semibold text-slate-800 mb-4">Performance Overview</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={performanceData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {performanceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80">
                        <h3 className="font-semibold text-slate-800 mb-4">Score History</h3>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                                    <RechartsTooltip cursor={{fill: '#f1f5f9'}} />
                                    <Area type="monotone" dataKey="score" stroke="#3b82f6" fillOpacity={1} fill="url(#colorScore)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-slate-400">No quiz data available yet</div>}
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold text-slate-800 mb-4">Recent Attempts</h3>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        {activeAttempts.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">No active attempts. Upload a document to start!</div>
                        ) : (
                            activeAttempts.slice(0, 10).map((attempt) => {
                                const quiz = quizzes.find(q => q.id === attempt.quizId);
                                return (
                                    <div key={attempt.id} className="p-4 border-b border-slate-100 last:border-0 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${attempt.score >= 80 ? 'bg-green-100 text-green-700' : attempt.score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{Math.round(attempt.score)}</div>
                                            <div>
                                                <p className="font-medium text-slate-900">{quiz?.title || 'Unknown Quiz'}</p>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <span className="capitalize">{attempt.mode} Mode</span><span>•</span><span>{new Date(attempt.completedAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleArchiveAttempt(attempt.id)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"><Archive className="w-4 h-4" /></button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderDocuments = () => {
        if (activeDocument && !activeQuiz) {
            return <QuizConfig document={activeDocument} onStart={handleStartQuiz} isLoading={isGenerating} />;
        }
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <FileUpload onDocumentProcessed={handleDocumentProcessed} />
                {documents.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-slate-800 mb-4">Your Library</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {documents.map(doc => (
                                <div key={doc.id} onClick={() => setActiveDocument(doc)} className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-lg cursor-pointer transition-all relative">
                                    <button onClick={(e) => handleDeleteDocument(doc.id, e)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors z-10"><Trash2 className="w-4 h-4" /></button>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform"><FileText className="w-6 h-6" /></div>
                                        <span className="text-xs font-medium text-slate-400">{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 mb-2 truncate pr-6">{doc.name}</h4>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {doc.topics.slice(0, 3).map(topic => <span key={topic} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">{topic}</span>)}
                                    </div>
                                    <div className="text-sm text-blue-600 font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">Generate Quiz <ArrowUpRight className="w-4 h-4" /></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Layout activeTab={activeTab === 'results' ? 'dashboard' : activeTab} onNavigate={handleNavigate}>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'documents' && renderDocuments()}
            {activeTab === 'quiz' && activeQuiz && <QuizPlayer quiz={activeQuiz} onComplete={handleQuizComplete} onExit={() => setActiveTab('documents')} />}
            {activeTab === 'results' && completedAttempt && activeQuiz && <QuizResults quiz={activeQuiz} attempt={completedAttempt} onRetry={() => setActiveTab('quiz')} onDashboard={() => { setActiveTab('dashboard'); setActiveQuiz(null); }} />}
            {activeTab === 'quiz' && !activeQuiz && (
                <div className="text-center py-20">
                    <h3 className="text-xl text-slate-600">No active quiz.</h3>
                    <button onClick={() => setActiveTab('documents')} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">Go to Documents</button>
                </div>
            )}
        </Layout>
    );
};

export default function App() {
  return (
    <AuthProvider>
        <ToastProvider>
            <HashRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
                </Routes>
            </HashRouter>
        </ToastProvider>
    </AuthProvider>
  );
}
