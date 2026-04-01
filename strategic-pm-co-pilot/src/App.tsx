/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  Plus, 
  Trash2, 
  Zap, 
  Download, 
  Loader2,
  ChevronRight,
  Building2,
  Target,
  ShieldCheck,
  TrendingUp,
  CheckSquare,
  ExternalLink,
  AlertCircle,
  Clock,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { marked } from 'marked';
import { Toaster, toast } from 'sonner';
import { cn } from './lib/utils';
import { generateStrategicContent, fetchMarketActivity, generateStrategicActions } from './lib/gemini';
import { initiateGoogleAuth, uploadToDrive } from './lib/googleDrive';

// Types
interface CompanyProfile {
  name: string;
  targetAudience: string;
  valueProposition: string;
  keyFeatures: string;
  pricingModel: string;
  secretSauce: string;
}

interface Competitor {
  id: string;
  name: string;
  url: string;
  notes: string;
}

interface MarketNews {
  id: string;
  title: string;
  link: string;
  snippet: string;
  date?: string;
  source?: string;
}

interface StrategicAction {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  type: 'feature' | 'positioning' | 'marketing';
}

type Tab = 'profile' | 'competitors' | 'output' | 'market' | 'actions';

const STORAGE_KEY_PROFILE = 'pm_copilot_profile';
const STORAGE_KEY_COMPETITORS = 'pm_copilot_competitors';
const STORAGE_KEY_THEME = 'pm_copilot_theme';

type Theme = 'light' | 'dark' | 'auto';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    return (saved as Theme) || 'auto';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    const root = window.document.documentElement;
    
    if (theme === 'auto') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  // Listen for system theme changes if in 'auto' mode
  useEffect(() => {
    if (theme !== 'auto') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      window.document.documentElement.classList.toggle('dark', mediaQuery.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const [profile, setProfile] = useState<CompanyProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse profile from localStorage", e);
      }
    }
    return {
      name: '',
      targetAudience: '',
      valueProposition: '',
      keyFeatures: '',
      pricingModel: '',
      secretSauce: ''
    };
  });

  const [competitors, setCompetitors] = useState<Competitor[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_COMPETITORS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse competitors from localStorage", e);
      }
    }
    return [];
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [contentType, setContentType] = useState<'positioning' | 'battlecard' | 'brief' | null>(null);
  const [marketNews, setMarketNews] = useState<MarketNews[]>([]);
  const [strategicActions, setStrategicActions] = useState<StrategicAction[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isPushingToLinear, setIsPushingToLinear] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COMPETITORS, JSON.stringify(competitors));
  }, [competitors]);

  const handleFetchMarketActivity = async () => {
    setIsGenerating(true);
    setActiveTab('market');
    try {
      const news = await fetchMarketActivity(competitors);
      setMarketNews(news);
    } catch (error) {
      console.error("Market fetch failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateActions = async () => {
    setIsGenerating(true);
    setActiveTab('actions');
    try {
      const actions = await generateStrategicActions(profile, competitors, marketNews);
      setStrategicActions(actions);
    } catch (error) {
      console.error("Action generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePushToLinear = async (action: StrategicAction) => {
    setIsPushingToLinear(true);
    const toastId = toast.loading(`Pushing "${action.title}" to Linear...`);
    try {
      // Proof of concept: This would call a backend API that uses the Linear SDK/API
      const response = await fetch('/api/linear/create-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[Strategic] ${action.title}`,
          description: `${action.description}\n\n---\nGenerated by PM Co-Pilot`,
          priority: action.priority === 'high' ? 1 : action.priority === 'medium' ? 2 : 3,
          label: action.type
        })
      });
      
      if (response.ok) {
        toast.success(`Successfully pushed to Linear!`, { id: toastId });
        // Update status locally
        setStrategicActions(prev => prev.map(a => 
          a.title === action.title ? { ...a, status: 'Pushed' } : a
        ));
      } else {
        const err = await response.json();
        toast.error(`Failed to push to Linear: ${err.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (error) {
      console.error("Linear push failed:", error);
      toast.error("Failed to push to Linear. Check connection.", { id: toastId });
    } finally {
      setIsPushingToLinear(false);
    }
  };

  const handleAddCompetitor = () => {
    const newCompetitor: Competitor = {
      id: crypto.randomUUID(),
      name: '',
      url: '',
      notes: ''
    };
    setCompetitors([...competitors, newCompetitor]);
  };

  const handleUpdateCompetitor = (id: string, updates: Partial<Competitor>) => {
    setCompetitors(competitors.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleRemoveCompetitor = (id: string) => {
    setCompetitors(competitors.filter(c => c.id !== id));
  };

  const handleGenerate = async (type: 'positioning' | 'battlecard' | 'brief') => {
    setIsGenerating(true);
    setContentType(type);
    setGeneratedContent(null);
    setActiveTab('output');
    
    try {
      const content = await generateStrategicContent(type, profile, competitors);
      setGeneratedContent(content);
    } catch (error) {
      console.error("Generation failed:", error);
      setGeneratedContent("### Error\nFailed to generate content. Please ensure your Gemini API Key is set up correctly.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportToDrive = async () => {
    if (!generatedContent) return;
    
    // Check for Client ID before starting
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      setShowSettings(true);
      return;
    }

    setIsExporting(true);
    try {
      const accessToken = await initiateGoogleAuth();
      
      // Convert Markdown to HTML for a "prettier" Google Doc
      // We wrap it in basic HTML structure with some styles to help Google Drive's converter
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
              h1 { color: #000; border-bottom: 1px solid #eee; padding-bottom: 10px; }
              h2 { color: #444; margin-top: 25px; }
              table { border-collapse: collapse; width: 100%; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background-color: #f8f8f8; font-weight: bold; }
              tr:nth-child(even) { background-color: #fafafa; }
              blockquote { border-left: 4px solid #ddd; padding-left: 15px; color: #666; font-style: italic; }
            </style>
          </head>
          <body>
            ${await marked.parse(generatedContent)}
          </body>
        </html>
      `;

      const fileName = `PM_CoPilot_${contentType}_${new Date().toISOString().split('T')[0]}`;
      await uploadToDrive(accessToken, fileName, htmlContent, true);
      alert("Successfully exported as a native Google Doc!");
    } catch (error) {
      console.error("Export failed:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred during export.";
      
      if (message.includes("Authentication cancelled")) {
        return;
      }

      if (message.includes("Google Drive API has not been used") || message.includes("disabled")) {
        const projectMatch = message.match(/project (\d+)/);
        const projectId = projectMatch ? projectMatch[1] : '';
        const enableUrl = projectId 
          ? `https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=${projectId}`
          : 'https://console.cloud.google.com/apis/library/drive.googleapis.com';

        alert(`Export Failed: Google Drive API is not enabled.\n\nPlease enable it here:\n${enableUrl}\n\nAfter enabling, wait 2-3 minutes and try again.`);
        return;
      }

      alert(`Export Failed:\n${message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      <Toaster position="top-right" theme={theme === 'auto' ? 'system' : theme} richColors />
      {/* Sidebar */}
      <aside className="w-64 border-r border-border flex flex-col bg-card">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-background fill-background" />
          </div>
          <h1 className="font-semibold text-lg tracking-tight">PM Co-Pilot</h1>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <SidebarItem 
            icon={<Building2 className="w-4 h-4" />} 
            label="Company Profile" 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
          />
          <SidebarItem 
            icon={<Users className="w-4 h-4" />} 
            label="Competitor Research" 
            active={activeTab === 'competitors'} 
            onClick={() => setActiveTab('competitors')} 
          />
          <SidebarItem 
            icon={<FileText className="w-4 h-4" />} 
            label="Strategic Output" 
            active={activeTab === 'output'} 
            onClick={() => setActiveTab('output')} 
          />
          <SidebarItem 
            icon={<TrendingUp className="w-4 h-4" />} 
            label="Market Activity" 
            active={activeTab === 'market'} 
            onClick={handleFetchMarketActivity} 
          />
          <SidebarItem 
            icon={<CheckSquare className="w-4 h-4" />} 
            label="Strategic Actions" 
            active={activeTab === 'actions'} 
            onClick={handleGenerateActions} 
          />
        </nav>

        <div className="p-4 border-t border-border">
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-3 px-3 py-2 w-full text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-4xl mx-auto p-12 relative">
          {/* Theme Toggle */}
          <div className="absolute top-8 right-12 flex items-center gap-1 bg-card border border-border rounded-full p-1 shadow-sm">
            <button
              onClick={() => setTheme('light')}
              className={cn(
                "p-2 rounded-full transition-all",
                theme === 'light' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              title="Light Mode"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('auto')}
              className={cn(
                "p-2 rounded-full transition-all",
                theme === 'auto' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              title="System Mode"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                "p-2 rounded-full transition-all",
                theme === 'dark' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              title="Dark Mode"
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight mb-2">Company Profile</h2>
                  <p className="text-muted-foreground">Define your core strategic identity to ground the AI's analysis.</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <InputGroup 
                    label="Company Name" 
                    value={profile.name} 
                    onChange={(v) => setProfile({ ...profile, name: v })} 
                    placeholder="e.g. Acme SaaS"
                  />
                  <InputGroup 
                    label="Target Audience" 
                    value={profile.targetAudience} 
                    onChange={(v) => setProfile({ ...profile, targetAudience: v })} 
                    placeholder="e.g. Mid-market fintech operations teams"
                  />
                  <TextAreaGroup 
                    label="Value Proposition" 
                    value={profile.valueProposition} 
                    onChange={(v) => setProfile({ ...profile, valueProposition: v })} 
                    placeholder="What is the primary problem you solve and how?"
                  />
                  <TextAreaGroup 
                    label="Key Features" 
                    value={profile.keyFeatures} 
                    onChange={(v) => setProfile({ ...profile, keyFeatures: v })} 
                    placeholder="List your top 3-5 differentiating features"
                  />
                  <InputGroup 
                    label="Pricing Model" 
                    value={profile.pricingModel} 
                    onChange={(v) => setProfile({ ...profile, pricingModel: v })} 
                    placeholder="e.g. $49/seat/mo or Usage-based"
                  />
                  <TextAreaGroup 
                    label="Secret Sauce" 
                    value={profile.secretSauce} 
                    onChange={(v) => setProfile({ ...profile, secretSauce: v })} 
                    placeholder="What is your unfair advantage? (Internal only)"
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'competitors' && (
              <motion.div
                key="competitors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-semibold tracking-tight mb-2">Competitor Research</h2>
                    <p className="text-muted-foreground">Map the landscape. Who are you up against?</p>
                  </div>
                  <button 
                    onClick={handleAddCompetitor}
                    className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-md font-medium hover:bg-muted transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Competitor
                  </button>
                </div>

                <div className="space-y-4">
                  {competitors.map((competitor) => (
                    <div key={competitor.id} className="p-6 bg-card border border-border rounded-xl space-y-4 relative group">
                      <button 
                        onClick={() => handleRemoveCompetitor(competitor.id)}
                        className="absolute top-4 right-4 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-2 gap-4">
                        <input 
                          className="bg-transparent border-b border-border py-2 focus:border-foreground outline-none transition-colors"
                          placeholder="Competitor Name"
                          value={competitor.name}
                          onChange={(e) => handleUpdateCompetitor(competitor.id, { name: e.target.value })}
                        />
                        <input 
                          className="bg-transparent border-b border-border py-2 focus:border-foreground outline-none transition-colors"
                          placeholder="Website URL"
                          value={competitor.url}
                          onChange={(e) => handleUpdateCompetitor(competitor.id, { url: e.target.value })}
                        />
                      </div>
                      <textarea 
                        className="w-full bg-background border border-border rounded-lg p-3 text-sm focus:border-foreground/20 outline-none transition-colors min-h-[100px]"
                        placeholder="Known Strengths & Weaknesses..."
                        value={competitor.notes}
                        onChange={(e) => handleUpdateCompetitor(competitor.id, { notes: e.target.value })}
                      />
                    </div>
                  ))}
                  {competitors.length === 0 && (
                    <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl">
                      <p className="text-muted-foreground">No competitors added yet. Start by adding your first rival.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'output' && (
              <motion.div
                key="output"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight mb-2">Strategic Output</h2>
                  <p className="text-muted-foreground">Leverage AI to synthesize research into high-stakes artifacts.</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <ActionButton 
                    label="Narrative Positioning" 
                    description="Target-Category-Benefit framework"
                    onClick={() => handleGenerate('positioning')}
                    disabled={isGenerating}
                  />
                  <ActionButton 
                    label="Competitive Battlecard" 
                    description="2x2 Win/Loss strategy grid"
                    onClick={() => handleGenerate('battlecard')}
                    disabled={isGenerating}
                  />
                  <ActionButton 
                    label="Research Brief" 
                    description="Long-form landscape analysis"
                    onClick={() => handleGenerate('brief')}
                    disabled={isGenerating}
                  />
                </div>

                <div className="min-h-[400px] bg-card border border-border rounded-2xl p-8 relative">
                  {isGenerating ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card/80 backdrop-blur-sm rounded-2xl z-10">
                      <Loader2 className="w-8 h-8 animate-spin text-foreground" />
                      <p className="text-sm font-medium animate-pulse">Synthesizing strategic insights...</p>
                    </div>
                  ) : generatedContent ? (
                    <div className="prose prose-invert max-w-none">
                      <div className="flex justify-between items-center mb-8 pb-4 border-b border-border">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          {contentType?.replace('_', ' ')}
                        </span>
                        <button 
                          onClick={handleExportToDrive}
                          disabled={isExporting}
                          className={cn(
                            "flex items-center gap-2 text-xs font-medium transition-colors disabled:opacity-50",
                            !import.meta.env.VITE_GOOGLE_CLIENT_ID 
                              ? "text-amber-500 hover:text-amber-400" 
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                          {isExporting ? 'Exporting...' : !import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'Setup Drive' : 'Save to Drive'}
                        </button>
                      </div>
                      <div className="markdown-content">
                        <Markdown>
                          {generatedContent}
                        </Markdown>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-20">
                      <FileText className="w-12 h-12 text-border mb-4" />
                      <p className="text-muted-foreground">Select an analysis type above to generate content.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'market' && (
              <motion.div
                key="market"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight mb-2">Market Activity</h2>
                  <p className="text-muted-foreground">Real-time competitor tracking via Google Search.</p>
                </div>

                {isGenerating ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-foreground" />
                    <p className="text-sm font-medium animate-pulse">Crawling market data...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {marketNews.map((news) => (
                      <a 
                        key={news.id}
                        href={news.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-6 bg-card border border-border rounded-xl hover:border-foreground/20 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold group-hover:text-foreground transition-colors">{news.title}</h4>
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">{news.snippet}</p>
                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {news.date || 'Recent'}</span>
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {news.source || 'News'}</span>
                        </div>
                      </a>
                    ))}
                    {marketNews.length === 0 && (
                      <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl">
                        <p className="text-muted-foreground">No recent activity found. Try refining competitor names.</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'actions' && (
              <motion.div
                key="actions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight mb-2">Strategic Actions</h2>
                  <p className="text-muted-foreground">Prioritized tactical moves to out-execute the competition.</p>
                </div>

                {isGenerating ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-foreground" />
                    <p className="text-sm font-medium animate-pulse">Prioritizing actions...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {strategicActions.map((action) => (
                      <div key={action.id} className="p-6 bg-card border border-border rounded-xl flex items-start justify-between gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest",
                              action.priority === 'high' ? "bg-red-500/10 text-red-500" :
                              action.priority === 'medium' ? "bg-amber-500/10 text-amber-500" :
                              "bg-blue-500/10 text-blue-500"
                            )}>
                              {action.priority}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{action.type}</span>
                          </div>
                          <h4 className="font-semibold">{action.title}</h4>
                          <p className="text-sm text-muted-foreground">{action.description}</p>
                        </div>
                        <button 
                          onClick={() => handlePushToLinear(action)}
                          disabled={isPushingToLinear}
                          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-border hover:bg-muted text-foreground rounded-md text-xs font-medium transition-all border border-foreground/10"
                        >
                          {isPushingToLinear ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                          Push to Linear
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl"
            >
              <h3 className="text-xl font-semibold mb-6">Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Gemini API</label>
                  <div className="p-3 bg-background border border-border rounded-lg flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    Platform Managed
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Google Drive Integration</label>
                  <p className="text-xs text-muted-foreground mb-4">
                    To enable Drive export, ensure <code className="bg-muted px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> is set in your environment.
                  </p>
                  <div className="flex items-center gap-2 text-sm mb-4">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      import.meta.env.VITE_GOOGLE_CLIENT_ID ? "bg-green-500" : "bg-red-500"
                    )} />
                    {import.meta.env.VITE_GOOGLE_CLIENT_ID ? "Configured" : "Not Configured"}
                  </div>
                  
                  {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                    <div className="p-4 bg-muted border border-border rounded-xl space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Troubleshooting</h4>
                      <ul className="text-[11px] text-muted-foreground space-y-2 list-disc pl-4">
                        <li>
                          Ensure <span className="text-foreground">Google Drive API</span> is enabled in your Google Cloud Console.
                        </li>
                        <li>
                          Add <span className="text-foreground">{window.location.origin}</span> to your OAuth <span className="text-foreground">Authorized JavaScript Origins</span>.
                        </li>
                        <li>
                          If you see a 403 error, wait 2-3 minutes after enabling the API for it to propagate.
                        </li>
                      </ul>
                      <a 
                        href="https://console.cloud.google.com/apis/library/drive.googleapis.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-foreground hover:underline mt-1"
                      >
                        Enable Drive API <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Linear Integration</label>
                  <p className="text-xs text-muted-foreground mb-4">
                    To push strategic actions to Linear, set <code className="bg-muted px-1 rounded">LINEAR_API_KEY</code> and <code className="bg-muted px-1 rounded">LINEAR_TEAM_ID</code> in your environment.
                  </p>
                  <div className="p-4 bg-muted border border-border rounded-xl space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Setup</h4>
                    <ul className="text-[11px] text-muted-foreground space-y-2 list-disc pl-4">
                      <li>Generate a Personal API Key in Linear (Settings &gt; API).</li>
                      <li>Find your Team ID (it's the 3-letter code in your Linear team's URL, e.g., <code className="bg-muted px-1 rounded">ENG</code>).</li>
                      <li>Add these to the AI Studio Secrets panel.</li>
                    </ul>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="mt-8 w-full py-2 bg-foreground text-background rounded-lg font-medium hover:bg-muted transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium transition-all",
        active ? "bg-border text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function InputGroup({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder: string }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      <input 
        className="w-full bg-card border border-border rounded-lg px-4 py-3 focus:border-foreground/20 outline-none transition-colors"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function TextAreaGroup({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder: string }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      <textarea 
        className="w-full bg-card border border-border rounded-lg px-4 py-3 focus:border-foreground/20 outline-none transition-colors min-h-[120px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function ActionButton({ label, description, onClick, disabled }: { label: string, description: string, onClick: () => void, disabled?: boolean }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className="p-5 bg-card border border-border rounded-xl text-left hover:border-foreground/20 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="font-semibold">{label}</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

