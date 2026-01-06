import React, { useState, useRef, useEffect } from 'react';
import { generateResponse } from '../services/geminiService';
import { UserProfile, ChatMessage, ToolMode } from '../types';
import { Send, Sparkles, AlertCircle, Globe, Map, Image as ImageIcon, Brain, Zap, ExternalLink, MapPin } from 'lucide-react';

interface ChatViewProps {
  user: UserProfile;
}

export const ChatView: React.FC<ChatViewProps> = ({ user }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Hello ${user.full_name || 'there'}! I'm Gemini. Select a mode below to get started.`,
      timestamp: Date.now()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ToolMode>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isPremium = user.subscription_tier === 'premium';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    if (!user.gemini_api_key) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'model',
          text: 'Your account has not been activated for AI access yet. Please contact the administrator.',
          timestamp: Date.now(),
          isError: true
        }
      ]);
      return;
    }

    const currentMode = selectedMode;
    
    // Add User Message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
      toolUsed: currentMode
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Call Service
      const result = await generateResponse({
        prompt: userMsg.text,
        apiKey: user.gemini_api_key,
        mode: currentMode,
        systemInstruction: "You are a helpful, concise AI assistant."
      });

      // Add Model Message
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: result.text,
        images: result.images,
        sources: result.sources,
        timestamp: Date.now(),
        toolUsed: currentMode
      };
      setMessages(prev => [...prev, modelMsg]);

    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `Error: ${error.message}`,
        timestamp: Date.now(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // --- Toolbar Component ---
  const ToolButton = ({ mode, icon: Icon, label, colorClass }: any) => {
    const isActive = selectedMode === mode;
    const isLocked = !isPremium && mode !== 'chat';

    return (
      <button
        type="button"
        disabled={isLocked}
        onClick={() => setSelectedMode(mode)}
        className={`flex flex-col items-center justify-center p-2 rounded-xl min-w-[70px] transition-all duration-200 ${
          isActive 
            ? 'bg-blue-50 text-ios-blue shadow-sm ring-1 ring-blue-100' 
            : isLocked 
              ? 'opacity-40 grayscale' 
              : 'text-gray-500 hover:bg-gray-50'
        }`}
      >
        <div className={`p-2 rounded-full mb-1 ${isActive ? 'bg-ios-blue text-white' : 'bg-gray-100'}`}>
           <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium leading-none">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-ios-background">
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-gray-200 flex justify-between items-center pt-safe">
        <div className="flex items-center gap-2">
           <Sparkles className={`w-5 h-5 ${isPremium ? 'text-amber-500 fill-amber-500' : 'text-ios-blue'}`} />
           <span className="font-semibold text-gray-900">Gemini {isPremium ? 'Premium' : 'Basic'}</span>
        </div>
        {!isPremium && (
          <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-700 rounded-lg">
            Upgrade for Tools
          </span>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
             {/* Message Bubble */}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-[16px] leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-ios-blue text-white rounded-br-none'
                  : msg.isError 
                    ? 'bg-red-50 text-ios-red border border-red-100 rounded-bl-none'
                    : 'bg-white text-gray-900 rounded-bl-none'
              }`}
            >
              {/* Error Icon */}
              {msg.isError && <AlertCircle className="w-4 h-4 inline mr-2 -mt-1"/>}
              
              {/* Tool Badge (Optional, mostly for debug/clarity) */}
              {msg.role === 'model' && msg.toolUsed && msg.toolUsed !== 'chat' && (
                <div className="mb-2 text-xs font-bold uppercase tracking-wide opacity-50 flex items-center gap-1">
                  {msg.toolUsed === 'image' && <ImageIcon className="w-3 h-3"/>}
                  {msg.toolUsed === 'search' && <Globe className="w-3 h-3"/>}
                  {msg.toolUsed === 'maps' && <Map className="w-3 h-3"/>}
                  {msg.toolUsed === 'thinking' && <Brain className="w-3 h-3"/>}
                  {msg.toolUsed} Result
                </div>
              )}

              {/* Main Text */}
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {/* Generated Images */}
              {msg.images && msg.images.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {msg.images.map((img, idx) => (
                    <img 
                      key={idx} 
                      src={img} 
                      alt="Generated content" 
                      className="rounded-xl w-full h-auto border border-gray-100 shadow-sm"
                    />
                  ))}
                </div>
              )}

              {/* Citations / Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100/20">
                  <p className="text-xs font-semibold mb-2 opacity-70">Sources & Locations:</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((source, idx) => (
                      <a 
                        key={idx}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors ${
                          msg.role === 'user' ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        {source.type === 'map' ? <MapPin className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                        <span className="max-w-[150px] truncate">{source.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isTyping && (
           <div className="flex justify-start">
             <div className="bg-white rounded-2xl rounded-bl-none px-4 py-4 shadow-sm flex gap-1.5 items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-0"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Tool Selection Bar (Premium Features) */}
      <div className="bg-white/95 backdrop-blur border-t border-gray-200 px-2 py-2">
        <div className="flex justify-between items-center gap-2 overflow-x-auto no-scrollbar pb-2 px-2">
          <ToolButton mode="chat" icon={Zap} label="Fast Chat" />
          <div className="w-px h-8 bg-gray-200 mx-1 flex-shrink-0" />
          <ToolButton mode="search" icon={Globe} label="Web Search" colorClass="text-blue-500" />
          <ToolButton mode="maps" icon={Map} label="Maps" colorClass="text-green-500" />
          <ToolButton mode="image" icon={ImageIcon} label="Create Img" colorClass="text-purple-500" />
          <ToolButton mode="thinking" icon={Brain} label="Deep Think" colorClass="text-orange-500" />
        </div>

        {/* Input Area */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-end gap-2 pt-2 px-2 pb-safe"
        >
          <input
            type="text"
            className="flex-1 bg-gray-100 border-none rounded-2xl px-4 py-3 text-[16px] focus:ring-2 focus:ring-ios-blue outline-none transition-all placeholder:text-gray-400"
            placeholder={
              selectedMode === 'image' ? "Describe the image to generate..." :
              selectedMode === 'search' ? "Ask about current events..." :
              selectedMode === 'maps' ? "Find places near me..." :
              "Message Gemini..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className={`rounded-full p-3 disabled:opacity-50 active:scale-90 transition-transform shadow-lg ${
              selectedMode === 'image' ? 'bg-purple-600 shadow-purple-500/30' :
              selectedMode === 'thinking' ? 'bg-orange-600 shadow-orange-500/30' :
              'bg-ios-blue shadow-blue-500/30'
            } text-white`}
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};