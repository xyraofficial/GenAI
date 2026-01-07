import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateResponse } from '../services/geminiService';
import { UserProfile, ChatMessage, ToolMode } from '../types';
import { 
  Send, Sparkles, AlertCircle, Globe, Map, Image as ImageIcon, 
  Brain, Zap, ExternalLink, MapPin, Loader2, ChevronLeft, Trash2,
  Copy, ThumbsUp, ThumbsDown, Share, Check, Lock, Crown
} from 'lucide-react';

interface ChatViewProps {
  user: UserProfile;
  onBack?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ user, onBack }) => {
  const [input, setInput] = useState('');
  
  // Storage key based on user ID to keep sessions private per user
  const STORAGE_KEY = `gemini_chat_${user.id}`;

  const createDefaultMessage = (): ChatMessage => ({
    id: 'welcome',
    role: 'model',
    text: `Hello ${user.full_name || 'there'}! I'm Gemini. \n\nI can help you with:\n* Writing & Analysis\n* Image Generation\n* Deep Reasoning\n* Real-time Search\n\nSelect a mode below to start.`,
    timestamp: Date.now()
  });

  // Initialize state from LocalStorage if available
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [createDefaultMessage()];
    } catch (e) {
      console.warn('Failed to load chat history', e);
      return [createDefaultMessage()];
    }
  });

  const [isTyping, setIsTyping] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ToolMode>('chat');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Ref to track the current generation request ID to handle race conditions/cancellation
  const generationIdRef = useRef(0);
  
  const isPremium = user.subscription_tier === 'premium';

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Auto-save messages to LocalStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save chat history', e);
    }
  }, [messages, STORAGE_KEY]);

  const handleClearChat = (e: React.MouseEvent) => {
    // Prevent default button behavior and event bubbling
    e.preventDefault();
    e.stopPropagation();

    // Use a small timeout to allow mobile tap animations to finish before the blocking confirm dialog
    setTimeout(() => {
      if (window.confirm("Start a new chat? This will clear your current history.")) {
        // Increment generation ID to invalidate any pending requests
        generationIdRef.current += 1;
        
        const newDefault = createDefaultMessage();
        // Force a unique ID to ensure React re-renders the component completely
        newDefault.id = `welcome-${Date.now()}`;
        newDefault.timestamp = Date.now(); 
        
        setMessages([newDefault]);
        setIsTyping(false);
        
        // Force immediate storage update
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify([newDefault]));
        } catch(err) {
          console.error("Storage update failed", err);
        }
      }
    }, 50);
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleShare = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Gemini Response',
          text: text,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback to copy
      handleCopy(text, 'share-fallback');
      alert('Link copied to clipboard');
    }
  };

  const handleFeedback = (id: string, type: 'like' | 'dislike') => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === id) {
        // Toggle if clicking same type, otherwise set type
        const newFeedback = msg.feedback === type ? null : type;
        return { ...msg, feedback: newFeedback };
      }
      return msg;
    }));
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const currentMode = selectedMode;
    const currentGenId = generationIdRef.current + 1;
    generationIdRef.current = currentGenId;
    
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
        apiKey: user.gemini_api_key, // Logic in service will fallback to process.env.API_KEY if this is undefined
        mode: currentMode,
        systemInstruction: "You are a helpful, concise AI assistant. Use Markdown to format your responses effectively."
      });

      // Check if this request is still valid (user hasn't cleared chat)
      if (generationIdRef.current === currentGenId) {
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
      }

    } catch (error: any) {
      if (generationIdRef.current === currentGenId) {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: `Error: ${error.message}`,
          timestamp: Date.now(),
          isError: true
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      if (generationIdRef.current === currentGenId) {
        setIsTyping(false);
      }
    }
  };

  // --- Toolbar Component ---
  const ToolButton = ({ mode, icon: Icon, label, colorClass, gradientClass }: any) => {
    const isPremiumFeature = mode !== 'chat';
    const isActive = selectedMode === mode;
    const isLocked = !isPremium && isPremiumFeature;

    return (
      <button
        type="button"
        onClick={() => {
           if (isLocked) {
              if(window.confirm("This is a Premium feature. Access requires a subscription. Upgrade now?")) {
                 // In a real app this would route to upgrade
              }
              return;
           }
           setSelectedMode(mode);
        }}
        className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl min-w-[76px] transition-all duration-300 ${
          isActive 
            ? 'bg-white shadow-sm ring-1 ring-black/5 scale-105 z-10' 
            : isLocked
              ? 'opacity-60 grayscale' 
              : 'hover:bg-white/50'
        }`}
      >
        {/* Premium Indicator */}
        {isPremiumFeature && (
           <div className={`absolute top-1 right-2 z-10 flex items-center justify-center`}>
             {isLocked ? (
               <div className="bg-gray-100/80 backdrop-blur rounded-full p-0.5 shadow-sm">
                 <Lock className="w-2.5 h-2.5 text-gray-500" />
               </div>
             ) : (
               <Crown className="w-2.5 h-2.5 text-amber-500 drop-shadow-sm" />
             )}
           </div>
        )}

        <div className={`p-2.5 rounded-xl mb-1.5 transition-all duration-300 ${
           isActive 
             ? `${gradientClass || 'bg-gray-900'} text-white shadow-md transform scale-105` 
             : isLocked
               ? 'bg-gray-100 text-gray-400'
               : `bg-gray-50 ${colorClass || 'text-gray-600'}`
        }`}>
           <Icon className="w-5 h-5" />
        </div>
        
        <span className={`text-[10px] font-semibold tracking-tight ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
          {label}
        </span>
      </button>
    );
  };

  // --- Loader Logic ---
  const getLoaderUI = () => {
    if (selectedMode === 'chat') {
      return (
        <div className="w-full flex items-center gap-3 p-4 animate-in fade-in">
           <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-ios-blue to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
           </div>
           <div className="bg-gray-100 rounded-2xl px-4 py-3 flex gap-1.5 items-center">
             <div className="w-2 h-2 bg-gray-400 rounded-full animate-[bounce_1s_infinite_0ms]"></div>
             <div className="w-2 h-2 bg-gray-400 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
             <div className="w-2 h-2 bg-gray-400 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
           </div>
        </div>
      );
    }

    const config = {
      image: { text: 'Crafting Image...', icon: ImageIcon, color: 'text-purple-600', border: 'border-purple-200', bg: 'bg-purple-50', glow: 'shadow-purple-500/20' },
      thinking: { text: 'Reasoning...', icon: Brain, color: 'text-orange-600', border: 'border-orange-200', bg: 'bg-orange-50', glow: 'shadow-orange-500/20' },
      search: { text: 'Browsing Web...', icon: Globe, color: 'text-blue-600', border: 'border-blue-200', bg: 'bg-blue-50', glow: 'shadow-blue-500/20' },
      maps: { text: 'Finding Location...', icon: Map, color: 'text-green-600', border: 'border-green-200', bg: 'bg-green-50', glow: 'shadow-green-500/20' },
    }[selectedMode] || { text: 'Processing...', icon: Sparkles, color: 'text-gray-600', border: 'border-gray-200', bg: 'bg-gray-50', glow: 'shadow-gray-500/20' };

    const Icon = config.icon;

    return (
      <div className="w-full flex justify-center py-6 animate-in zoom-in-95 duration-300">
        <div className={`flex items-center gap-4 px-6 py-4 rounded-full shadow-lg border ${config.border} ${config.bg} ${config.glow} backdrop-blur-md`}>
          <div className="relative">
             <div className={`absolute inset-0 ${config.color} blur-md opacity-30 animate-pulse`}></div>
             <Icon className={`w-6 h-6 ${config.color} relative z-10 animate-bounce`} />
          </div>
          <div className="flex flex-col">
            <span className={`text-base font-bold ${config.color}`}>{config.text}</span>
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Gemini 3 is working</span>
          </div>
          <Loader2 className={`w-5 h-5 ${config.color} animate-spin ml-2 opacity-60`} />
        </div>
      </div>
    );
  };

  // Use dvh for mobile browser height consistency
  return (
    <div className="flex flex-col h-[100dvh] bg-ios-background">
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-gray-200 flex justify-between items-center pt-safe">
        <div className="flex items-center gap-2">
           {onBack && (
             <button onClick={onBack} className="p-1 -ml-2 text-ios-blue active:opacity-50">
               <ChevronLeft className="w-7 h-7" />
             </button>
           )}
           <div className={`w-2 h-2 rounded-full ${isPremium ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-ios-blue'}`}></div>
           <span className="font-semibold text-gray-900 tracking-tight">Gemini {isPremium ? 'Premium' : 'Basic'}</span>
        </div>
        <div className="flex items-center gap-2">
          {!isPremium && (
            <span className="text-[10px] font-bold px-2 py-1 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 rounded-full hidden sm:block border border-amber-200/50">
              UPGRADE
            </span>
          )}
          <button 
            type="button"
            onClick={handleClearChat}
            className="relative z-30 p-2 text-gray-400 hover:text-red-500 active:text-red-600 transition-colors rounded-full hover:bg-gray-100"
            title="Clear Chat History"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start w-full'}`}
          >
             {/* 
                 MESSAGE CONTAINER 
                 - User: Bubble style, Right aligned
                 - Model: Full Width, Markdown style, Left aligned
             */}
            
            {msg.role === 'user' ? (
              // USER MESSAGE (BUBBLE)
              <div className="max-w-[85%] bg-ios-blue text-white rounded-2xl rounded-br-none px-4 py-3 shadow-md shadow-blue-500/10 text-[16px] leading-relaxed">
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>
            ) : (
              // MODEL MESSAGE (FULL WIDTH CONTENT)
              <div className={`w-full group ${msg.isError ? 'bg-red-50 border border-red-100 rounded-xl p-4' : 'px-1'}`}>
                
                {/* Tool Badge / Icon */}
                {!msg.isError && (
                  <div className="mb-2 flex items-center gap-2">
                     <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                       msg.toolUsed === 'image' ? 'bg-purple-100 text-purple-600' :
                       msg.toolUsed === 'thinking' ? 'bg-orange-100 text-orange-600' :
                       msg.toolUsed === 'search' ? 'bg-blue-100 text-blue-600' :
                       msg.toolUsed === 'maps' ? 'bg-green-100 text-green-600' :
                       'bg-gradient-to-tr from-gray-100 to-gray-200 text-gray-600'
                     }`}>
                        {msg.toolUsed === 'image' ? <ImageIcon className="w-3.5 h-3.5" /> :
                         msg.toolUsed === 'thinking' ? <Brain className="w-3.5 h-3.5" /> :
                         msg.toolUsed === 'search' ? <Globe className="w-3.5 h-3.5" /> :
                         msg.toolUsed === 'maps' ? <Map className="w-3.5 h-3.5" /> :
                         <Sparkles className="w-3.5 h-3.5" />}
                     </div>
                     <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        {msg.toolUsed === 'chat' ? 'Gemini' : `Gemini ${msg.toolUsed}`}
                     </span>
                  </div>
                )}

                {/* Content Area */}
                {msg.isError ? (
                  <div className="flex items-center text-red-600 gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{msg.text}</span>
                  </div>
                ) : (
                  <div className="prose prose-slate prose-lg max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-ios-blue prose-img:rounded-xl">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({node, ...props}) => (
                          <a {...props} target="_blank" rel="noopener noreferrer" className="text-ios-blue underline break-all" />
                        )
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Generated Images */}
                {msg.images && msg.images.length > 0 && (
                  <div className="mt-4 grid gap-4">
                    {msg.images.map((img, idx) => (
                      <div key={idx} className="relative rounded-2xl overflow-hidden shadow-lg border border-gray-100 group-hover:shadow-xl transition-shadow">
                        <img 
                          src={img} 
                          alt="Generated content" 
                          className="w-full h-auto object-cover max-h-[500px]"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur text-white text-[10px] px-2 py-1 rounded-lg">
                          Generated by Gemini
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Citations / Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {msg.sources.map((source, idx) => (
                      <a 
                        key={idx}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-colors"
                      >
                        {source.type === 'map' ? <MapPin className="w-3 h-3 text-green-500" /> : <Globe className="w-3 h-3 text-blue-500" />}
                        <span className="max-w-[200px] truncate">{source.title}</span>
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Response Actions (Copy, Like, Dislike, Share) */}
                {!msg.isError && (
                  <div className="flex items-center gap-4 mt-4 pt-2 border-t border-gray-50 text-gray-400">
                    <button 
                      onClick={() => handleCopy(msg.text, msg.id)}
                      className="flex items-center gap-1.5 hover:text-gray-600 transition-colors p-1"
                      title="Copy text"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    
                    <button 
                      onClick={() => handleFeedback(msg.id, 'like')}
                      className={`flex items-center gap-1.5 transition-colors p-1 ${msg.feedback === 'like' ? 'text-ios-blue' : 'hover:text-gray-600'}`}
                      title="Good response"
                    >
                      <ThumbsUp className={`w-4 h-4 ${msg.feedback === 'like' ? 'fill-current' : ''}`} />
                    </button>
                    
                    <button 
                      onClick={() => handleFeedback(msg.id, 'dislike')}
                      className={`flex items-center gap-1.5 transition-colors p-1 ${msg.feedback === 'dislike' ? 'text-red-500' : 'hover:text-gray-600'}`}
                      title="Bad response"
                    >
                      <ThumbsDown className={`w-4 h-4 ${msg.feedback === 'dislike' ? 'fill-current' : ''}`} />
                    </button>

                    <button 
                      onClick={() => handleShare(msg.text)}
                      className="flex items-center gap-1.5 hover:text-gray-600 transition-colors p-1"
                      title="Share"
                    >
                      <Share className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {isTyping && getLoaderUI()}
        
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Tool Selection Bar (Premium Features) */}
      <div className="bg-white/95 backdrop-blur border-t border-gray-200 px-2 pt-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-10">
        <div className="flex justify-between items-center gap-1 overflow-x-auto no-scrollbar pb-2 px-2 scroll-smooth">
          <ToolButton 
            mode="chat" 
            icon={Zap} 
            label="Fast Chat" 
            colorClass="text-gray-600"
            gradientClass="bg-gradient-to-tr from-ios-blue to-cyan-500"
          />
          <div className="w-px h-8 bg-gray-200 mx-1 flex-shrink-0" />
          <ToolButton 
            mode="search" 
            icon={Globe} 
            label="Search" 
            colorClass="text-blue-500" 
            gradientClass="bg-gradient-to-tr from-blue-500 to-indigo-500"
          />
          <ToolButton 
            mode="maps" 
            icon={Map} 
            label="Maps" 
            colorClass="text-green-500" 
            gradientClass="bg-gradient-to-tr from-green-500 to-emerald-600"
          />
          <ToolButton 
            mode="image" 
            icon={ImageIcon} 
            label="Imagine" 
            colorClass="text-purple-500" 
            gradientClass="bg-gradient-to-tr from-purple-500 to-fuchsia-500"
          />
          <ToolButton 
            mode="thinking" 
            icon={Brain} 
            label="Think" 
            colorClass="text-orange-500" 
            gradientClass="bg-gradient-to-tr from-orange-500 to-red-500"
          />
        </div>

        {/* Input Area */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="relative flex items-end gap-2 pt-2 px-2 pb-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              className="w-full bg-gray-100 border border-transparent focus:bg-white focus:border-ios-blue/30 rounded-[24px] pl-5 pr-14 py-3.5 text-[16px] focus:ring-4 focus:ring-ios-blue/10 outline-none transition-all placeholder:text-gray-400"
              placeholder={
                selectedMode === 'image' ? "Describe the image to generate..." :
                selectedMode === 'search' ? "Ask about current events..." :
                selectedMode === 'thinking' ? "Ask a complex question..." :
                selectedMode === 'maps' ? "Find places near me..." :
                "Message Gemini..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            {/* Send Button Absolute Positioned Inside Input */}
            <button 
              type="submit"
              disabled={!input.trim() || isTyping}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-2 disabled:opacity-50 active:scale-90 transition-all ${
                selectedMode === 'image' ? 'bg-purple-600 text-white shadow-sm' :
                selectedMode === 'thinking' ? 'bg-orange-600 text-white shadow-sm' :
                'bg-ios-blue text-white shadow-sm'
              }`}
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};