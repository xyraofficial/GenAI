import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { AuthView } from './views/AuthView';
import { ChatView } from './views/ChatView';
import { ProfileView } from './views/ProfileView';
import { AppView, UserProfile } from './types';
import { Home, MessageCircle, User as UserIcon, Plus, Clock, ChevronRight } from 'lucide-react';

// Default mock user for initial render state before auth check
const DEFAULT_USER: UserProfile = {
  id: '',
  email: '',
  role: 'user',
  subscription_tier: 'free'
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.AUTH);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id, session.user.email!);
      else setLoading(false);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id, session.user.email!);
      } else {
        setUserProfile(null);
        setCurrentView(AppView.AUTH);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Handle specific Supabase errors
      if (error) {
        if (error.code === '42P01') {
          console.warn("⚠️ DATABASE SETUP REQUIRED: The 'profiles' table does not exist.");
          console.warn("👉 Please copy the code from 'setup_database.sql' and run it in your Supabase SQL Editor.");
        } else if (error.code !== 'PGRST116') {
          // PGRST116 is "Row not found", which is expected for new users before we create it.
          console.error("Error fetching profile:", error.message);
        }
      }

      if (data) {
        setUserProfile(data as UserProfile);
      } else {
        // Create default profile if none exists (First login)
        const newProfile: UserProfile = {
          id: userId,
          email: email,
          role: 'user',
          subscription_tier: 'free',
          full_name: email.split('@')[0],
        };
        
        // Attempt to save to DB
        const { error: insertError } = await supabase.from('profiles').insert([newProfile]);
        
        if (insertError) {
             if (insertError.code === '42P01') {
               // Table doesn't exist, we just warned above. Using local state.
             } else {
               console.warn("Could not persist profile:", insertError.message);
             }
        }
        
        setUserProfile(newProfile);
      }
      
      // Default to Home view after successful login
      setCurrentView(AppView.HOME); 
    } catch (e: any) {
      console.error("Unexpected error in profile fetch:", e.message || e);
      // Fallback
      setUserProfile({ ...DEFAULT_USER, id: userId, email });
      setCurrentView(AppView.HOME);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    setSession(null);
    setCurrentView(AppView.AUTH);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ios-background">
        <div className="w-8 h-8 border-4 border-ios-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session || !userProfile) {
    return <AuthView onLoginSuccess={() => {}} />;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-ios-background text-gray-900 font-sans overflow-hidden">
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative w-full h-full">
        {currentView === AppView.CHAT && <ChatView user={userProfile} />}
        {currentView === AppView.PROFILE && (
          <ProfileView 
            user={userProfile} 
            onUpdateUser={setUserProfile} 
            onLogout={handleLogout} 
          />
        )}
        {currentView === AppView.HOME && (
          <div className="flex flex-col h-full overflow-y-auto bg-ios-background p-4 pt- safe pb-24">
             {/* Header */}
             <div className="flex justify-between items-end mb-6 mt-2 pt-safe">
               <div>
                 <p className="text-gray-500 text-sm font-medium uppercase tracking-wide mb-1">
                   {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                 </p>
                 <h1 className="text-3xl font-bold text-gray-900">Good {new Date().getHours() < 12 ? 'Morning' : 'Evening'}</h1>
               </div>
               <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100 flex items-center justify-center">
                  {userProfile.avatar_url ? (
                    <img src={userProfile.avatar_url} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-ios-blue text-white font-bold">
                      {userProfile.full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
               </div>
             </div>

             {/* Main Action */}
             <div 
               className="bg-white rounded-2xl p-6 shadow-ios-card mb-8 active:scale-[0.98] transition-transform cursor-pointer"
               onClick={() => setCurrentView(AppView.CHAT)}
             >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 rounded-xl text-ios-blue">
                    <MessageCircle className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">NEW</span>
                </div>
                <h3 className="text-xl font-bold mb-1">Start New Chat</h3>
                <p className="text-gray-500 text-sm">Use Gemini 3 to write, plan, and create.</p>
             </div>

             {/* Recent Activity Section */}
             <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
               <Clock className="w-5 h-5 text-gray-400" />
               Recent Activity
             </h2>
             
             <div className="bg-white rounded-2xl shadow-ios-card overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer" onClick={() => setCurrentView(AppView.CHAT)}>
                       <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-ios-blue" />
                         <div>
                           <p className="font-semibold text-gray-900">Project Idea Generation</p>
                           <p className="text-xs text-gray-400">2 hours ago</p>
                         </div>
                       </div>
                       <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-gray-50 text-center text-sm font-medium text-ios-blue border-t border-gray-100 cursor-pointer">
                  View All History
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="bg-white/90 backdrop-blur-xl border-t border-gray-200 pb-safe pt-2 px-6 shadow-ios-nav z-30 fixed bottom-0 w-full">
        <div className="flex justify-around items-center h-14">
          <NavButton 
            active={currentView === AppView.HOME} 
            onClick={() => setCurrentView(AppView.HOME)} 
            icon={<Home className="w-6 h-6" />} 
            label="Home" 
          />
          <NavButton 
            active={currentView === AppView.CHAT} 
            onClick={() => setCurrentView(AppView.CHAT)} 
            icon={<Plus className="w-6 h-6" />} 
            label="New Chat" 
          />
          <NavButton 
            active={currentView === AppView.PROFILE} 
            onClick={() => setCurrentView(AppView.PROFILE)} 
            icon={<UserIcon className="w-6 h-6" />} 
            label="Profile" 
          />
        </div>
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-16 transition-colors duration-200 ${
      active ? 'text-ios-blue' : 'text-gray-400 hover:text-gray-500'
    }`}
  >
    {icon}
    <span className="text-[10px] font-medium mt-1">{label}</span>
  </button>
);

export default App;