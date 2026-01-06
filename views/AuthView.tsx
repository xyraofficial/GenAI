import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { IOSButton } from '../components/ui/IOSButton';
import { IOSInput } from '../components/ui/IOSInput';
import { MessageCircle, ShieldCheck } from 'lucide-react';

interface AuthViewProps {
  onLoginSuccess: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Check your email for the confirmation link.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-ios-background">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="w-20 h-20 bg-ios-blue rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-8">
          <MessageCircle className="text-white w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-gray-500 mb-8 text-center">
          {mode === 'signin' 
            ? 'Sign in to access your AI assistant.' 
            : 'Get started with your personal AI workspace.'}
        </p>

        <form onSubmit={handleAuth} className="w-full space-y-2">
          <IOSInput 
            type="email" 
            placeholder="name@example.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            label="Email"
          />
          <IOSInput 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            label="Password"
          />

          {error && (
            <div className="p-3 bg-red-50 text-ios-red text-sm rounded-xl border border-red-100 mb-4">
              {error}
            </div>
          )}
          
          {message && (
            <div className="p-3 bg-green-50 text-ios-green text-sm rounded-xl border border-green-100 mb-4">
              {message}
            </div>
          )}

          <div className="pt-4">
            <IOSButton type="submit" isLoading={loading}>
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </IOSButton>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
            <button 
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
                setMessage(null);
              }}
              className="ml-1 text-ios-blue font-semibold"
            >
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
        
        <div className="mt-12 flex items-center text-xs text-gray-400">
           <ShieldCheck className="w-3 h-3 mr-1" />
           <span>Secure Supabase Authentication</span>
        </div>
      </div>
    </div>
  );
};
