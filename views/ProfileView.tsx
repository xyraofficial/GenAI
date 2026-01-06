import React, { useRef, useState } from 'react';
import { UserProfile, SubscriptionTier } from '../types';
import { supabase } from '../lib/supabase';
import { IOSButton } from '../components/ui/IOSButton';
import { User, CreditCard, LogOut, ShieldCheck, AlertCircle, Camera, Loader2 } from 'lucide-react';

interface ProfileViewProps {
  user: UserProfile;
  onUpdateUser: (u: UserProfile) => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdateUser, onLogout }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const toggleSubscription = async () => {
     // Toggle between Free and Premium for demo purposes
     const newTier: SubscriptionTier = user.subscription_tier === 'free' ? 'premium' : 'free';
     const updatedUser = { ...user, subscription_tier: newTier };
     
     // Optimistic update
     onUpdateUser(updatedUser); 
     
     try {
       await supabase.from('profiles').update({ subscription_tier: newTier }).eq('id', user.id);
     } catch(e) { /* ignore for demo */ }
  };

  const handleAvatarClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Basic validation
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

      // 1. Upload to Supabase Storage (bucket: 'avatars')
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update Profile Table
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (dbError) throw dbError;

      // 4. Update Local State
      onUpdateUser({ ...user, avatar_url: publicUrl });

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload image. Please ensure you have created a public "avatars" bucket in Supabase Storage.');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const hasApiKey = !!user.gemini_api_key;

  return (
    <div className="flex flex-col h-full bg-ios-background p-4 overflow-y-auto pb-24">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 mt-4">Profile</h1>

      {/* User Card */}
      <div className="bg-white rounded-2xl shadow-ios-card p-6 mb-6 flex items-center gap-4">
        
        {/* Interactive Avatar */}
        <div className="relative group">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*"
            disabled={isUploading}
          />
          <button 
            onClick={handleAvatarClick}
            disabled={isUploading}
            className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-sm relative transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-ios-blue"
          >
            {isUploading ? (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20 transition-all">
                <Loader2 className="w-8 h-8 text-white/90 animate-spin" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center z-10">
                 {/* Only show camera icon if no image or on hover/touch interaction context usually implies editability */}
              </div>
            )}

            {user.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-gray-400" />
            )}
            
            {/* Camera Overlay Badge */}
            {!isUploading && (
              <div className="absolute bottom-0 right-0 bg-ios-blue text-white p-1.5 rounded-full border-2 border-white shadow-sm z-20">
                <Camera className="w-3 h-3" />
              </div>
            )}
          </button>
        </div>

        <div className="flex-1">
           <h2 className="text-xl font-bold text-gray-900">{user.full_name || 'User'}</h2>
           <p className="text-gray-500 text-sm">{user.email}</p>
           <div className="mt-2 flex gap-2">
             <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-semibold text-gray-600 uppercase tracking-wide">
               {user.role}
             </span>
             <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${user.subscription_tier === 'premium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
               {user.subscription_tier}
             </span>
           </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        
        {/* Account Status Section */}
        <section className="bg-white rounded-2xl shadow-ios-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-ios-blue" />
            <h3 className="font-semibold text-gray-900">Account Status</h3>
          </div>
          
          <div className={`p-4 rounded-xl border flex items-center gap-3 ${hasApiKey ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
            {hasApiKey ? (
              <ShieldCheck className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-600" />
            )}
            <div>
              <p className={`font-bold ${hasApiKey ? 'text-green-800' : 'text-amber-800'}`}>
                {hasApiKey ? 'AI Access Active' : 'Access Pending'}
              </p>
              <p className={`text-xs ${hasApiKey ? 'text-green-600' : 'text-amber-700'}`}>
                {hasApiKey 
                  ? 'Your account is fully configured to use Gemini models.' 
                  : 'Contact your administrator to enable AI capabilities for this account.'}
              </p>
            </div>
          </div>
        </section>

        {/* Subscription Demo */}
        <section className="bg-white rounded-2xl shadow-ios-card p-5">
           <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900">Subscription Plan</h3>
          </div>
          
          <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-700">Current Plan</span>
              <span className="font-bold text-gray-900 capitalize">{user.subscription_tier}</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {user.subscription_tier === 'free' 
                ? 'Upgrade to access Gemini 1.5 Pro and image capabilities.' 
                : 'You have access to all premium features.'}
            </p>
            <IOSButton 
              variant={user.subscription_tier === 'free' ? 'primary' : 'secondary'}
              onClick={toggleSubscription}
            >
              {user.subscription_tier === 'free' ? 'Upgrade to Premium' : 'Manage Subscription'}
            </IOSButton>
          </div>
        </section>

        <IOSButton variant="destructive" onClick={onLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </IOSButton>

      </div>
    </div>
  );
};