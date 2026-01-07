import React, { useRef, useState, useEffect } from 'react';
import { UserProfile, SubscriptionTier } from '../types';
import { supabase } from '../lib/supabase';
import { 
  User, CreditCard, ShieldCheck, Camera, Loader2, 
  ChevronRight, Trash2, HelpCircle, Crown, Check 
} from 'lucide-react';

interface ProfileViewProps {
  user: UserProfile;
  onUpdateUser: (u: UserProfile) => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdateUser, onLogout }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Reset image loaded state when URL changes (e.g. after upload)
  useEffect(() => {
    setImageLoaded(false);
  }, [user.avatar_url]);

  const toggleSubscription = async () => {
     const newTier: SubscriptionTier = user.subscription_tier === 'free' ? 'premium' : 'free';
     const updatedUser = { ...user, subscription_tier: newTier };
     onUpdateUser(updatedUser); 
     try {
       await supabase.from('profiles').update({ subscription_tier: newTier }).eq('id', user.id);
     } catch(e) { 
       console.error("Failed to update subscription", e);
       // Revert on error
       onUpdateUser(user);
     }
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to delete all chat history on this device?')) {
      const STORAGE_KEY = `gemini_chat_${user.id}`;
      localStorage.removeItem(STORAGE_KEY);
      alert('Chat history cleared.');
    }
  };

  const handleAvatarClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.');
      return;
    }
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: dbError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      if (dbError) throw dbError;
      onUpdateUser({ ...user, avatar_url: publicUrl });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload image. Ensure "avatars" bucket exists and is public.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Helper component for iOS List Items
  const ListItem = ({ icon: Icon, color, label, value, onClick, isDestructive = false, showChevron = true, valueColor = "text-gray-500" }: any) => (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between p-4 bg-white active:bg-gray-50 transition-colors cursor-pointer first:rounded-t-xl last:rounded-b-xl border-b border-gray-100 last:border-0`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-lg ${color} text-white shadow-sm`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={`text-[16px] font-medium ${isDestructive ? 'text-red-500' : 'text-gray-900'}`}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className={`text-[15px] ${valueColor}`}>{value}</span>}
        {showChevron && <ChevronRight className="w-4 h-4 text-gray-300" />}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col w-full h-full bg-ios-background overflow-y-auto overscroll-y-contain pt-safe px-4 pb-32">
      
      {/* 
          Profile Header Section 
      */}
      <div className="flex items-center w-full mt-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Avatar Wrapper */}
        <div className="relative group flex-shrink-0">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" disabled={isUploading} />
          <button 
            onClick={handleAvatarClick}
            disabled={isUploading}
            className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden border-[5px] border-white shadow-sm relative transition-all active:scale-95 focus:outline-none ring-1 ring-gray-100"
          >
            {isUploading && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-30">
                <Loader2 className="w-8 h-8 text-white/90 animate-spin" />
              </div>
            )}

            {(!user.avatar_url || !imageLoaded) && (
               <div className="absolute inset-0 flex items-center justify-center bg-gray-200 z-10">
                  <User className="w-10 h-10 text-gray-400" />
               </div>
            )}

            {user.avatar_url && (
              <img 
                src={user.avatar_url} 
                alt="Profile" 
                className={`w-full h-full object-cover transition-opacity duration-500 z-20 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(false)}
              />
            )}
            
            {!isUploading && (
              <div className="absolute bottom-0 right-1 bg-ios-blue text-white p-1.5 rounded-full border-[3px] border-white shadow-sm z-30">
                <Camera className="w-3.5 h-3.5" />
              </div>
            )}
          </button>
        </div>

        {/* Content Column */}
        <div className="flex flex-col items-start ml-4 flex-1 min-w-0">
          
          <div className="flex items-center gap-[6px] w-full">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight truncate">
              {user.full_name || 'User'}
            </h2>
            {user.role === 'admin' && (
              <div className="bg-ios-blue text-white rounded-full p-0.5 flex-shrink-0" title="Verified Administrator">
                <Check className="w-3 h-3" strokeWidth={3} />
              </div>
            )}
          </div>

          <p className="text-gray-500 text-[15px] mt-0.5 truncate w-full">
            {user.email}
          </p>
          
          <div className="flex items-center mt-3">
            {user.role === 'admin' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-gray-900 text-white shadow-sm ring-1 ring-black/5">
                <ShieldCheck className="w-3 h-3" />
                Administrator
              </span>
            ) : user.subscription_tier === 'premium' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border border-amber-200 shadow-sm">
                <Crown className="w-3 h-3" />
                Premium Member
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500 border border-gray-200">
                Free Account
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Menu Group 1: General Settings */}
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-4 mb-2">General</h3>
      <div className="mb-6 shadow-sm rounded-xl">
        <ListItem 
          icon={CreditCard} 
          color="bg-purple-500" 
          label="Subscription" 
          value={user.subscription_tier === 'premium' ? "Premium" : "Free"}
          onClick={toggleSubscription}
        />
      </div>

      {/* Menu Group 2: Data & Support */}
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-4 mb-2">Data & Support</h3>
      <div className="mb-8 shadow-sm rounded-xl">
        <ListItem 
          icon={Trash2} 
          color="bg-red-500" 
          label="Clear Chat History" 
          onClick={handleClearHistory}
        />
        <ListItem 
          icon={HelpCircle} 
          color="bg-gray-500" 
          label="Help Center" 
          onClick={() => window.open('https://ai.google.dev', '_blank')}
        />
      </div>

      {/* Sign Out Button */}
      <div className="shadow-sm rounded-xl overflow-hidden mb-6">
        <div 
          onClick={onLogout}
          className="flex items-center justify-center p-4 bg-white active:bg-gray-50 transition-colors cursor-pointer"
        >
          <span className="text-[17px] font-semibold text-red-600">
            Log Out
          </span>
        </div>
      </div>

      <div className="mt-4 text-center pb-8">
        <p className="text-xs text-gray-400">Gemini iOS App v1.0.5</p>
      </div>

    </div>
  );
};