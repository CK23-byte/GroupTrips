import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Lock,
  Camera,
  ChevronLeft,
  Save,
  Plane,
  Image,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const AVATARS = [
  '🧑‍✈️', '👨‍✈️', '👩‍✈️', '🧳', '✈️', '🌴', '🏖️', '🗺️',
  '🎒', '🚀', '🌍', '🌎', '🌏', '⛵', '🚂', '🏔️',
];

export default function ProfilePage() {
  const { user, updateProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar_url || '🧑‍✈️');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(user?.profile_photo || null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoUpload(file: File) {
    if (!user) return;

    setUploadingPhoto(true);
    setMessage(null);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `profiles/${user.id}/${Date.now()}.${fileExt}`;

      console.log('[Profile] Uploading photo:', fileName);

      const { error: uploadError } = await supabase.storage
        .from('trip-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('[Profile] Upload error:', uploadError);
        setMessage({ type: 'error', text: 'Failed to upload photo' });
        setUploadingPhoto(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('trip-media')
        .getPublicUrl(fileName);

      console.log('[Profile] Photo uploaded:', publicUrl);
      setProfilePhoto(publicUrl);

      // Save to profile
      const { error: updateError } = await updateProfile({ profile_photo: publicUrl });
      if (updateError) {
        setMessage({ type: 'error', text: updateError });
      } else {
        setMessage({ type: 'success', text: 'Profile photo updated!' });
      }
    } catch (err) {
      console.error('[Profile] Photo upload error:', err);
      setMessage({ type: 'error', text: 'Failed to upload photo' });
    }

    setUploadingPhoto(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoUpload(file);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await updateProfile({ name, avatar_url: avatar });

    if (error) {
      setMessage({ type: 'error', text: error });
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    }

    setLoading(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    }

    setLoading(false);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Profile Settings</h1>
          </div>
          <Link to="/" className="flex items-center gap-2">
            <Plane className="w-6 h-6 text-blue-400" />
            <span className="font-bold">GroupTrips</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl ${
              message.type === 'success'
                ? 'bg-green-500/20 border border-green-500/50 text-green-200'
                : 'bg-red-500/20 border border-red-500/50 text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile Info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Profile Information
            </h2>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Profile Photo */}
              <div className="flex flex-col items-center mb-6">
                {/* Hidden file inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Profile photo or emoji avatar */}
                <div className="relative">
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-4 border-blue-500/30"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-fuchsia-500 flex items-center justify-center text-4xl">
                      {avatar}
                    </div>
                  )}
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <p className="text-sm text-white/50 mt-2">
                  {profilePhoto ? 'Change your photo' : 'Add a profile photo'}
                </p>

                {/* Photo upload buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-2 px-3 py-2 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    <Image className="w-4 h-4" />
                    Gallery
                  </button>
                </div>

                {/* Emoji picker toggle */}
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="mt-3 text-sm text-white/50 hover:text-white/70"
                >
                  {profilePhoto ? 'Or use an emoji instead' : 'Or choose an emoji avatar'}
                </button>

                {showAvatarPicker && (
                  <div className="mt-4 p-4 bg-white/5 rounded-xl grid grid-cols-8 gap-2">
                    {AVATARS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => {
                          setAvatar(a);
                          setProfilePhoto(null); // Clear photo when selecting emoji
                          setShowAvatarPicker(false);
                        }}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl hover:bg-white/10 transition-colors ${
                          avatar === a && !profilePhoto ? 'bg-blue-500/30 ring-2 ring-blue-500' : ''
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="profile-name" className="block text-sm font-medium text-white/70 mb-2">
                  Full Name
                </label>
                <input
                  id="profile-name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="block text-sm font-medium text-white/70 mb-2">
                  Email
                </label>
                <input
                  id="profile-email"
                  name="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input-field opacity-50 cursor-not-allowed"
                  aria-describedby="email-hint"
                />
                <p id="email-hint" className="text-xs text-white/40 mt-1">Email cannot be changed</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : message?.type === 'success' ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Lock className="w-5 h-5 text-fuchsia-400" />
              Change Password
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="profile-new-password" className="block text-sm font-medium text-white/70 mb-2">
                  New Password
                </label>
                <input
                  id="profile-new-password"
                  name="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label htmlFor="profile-confirm-password" className="block text-sm font-medium text-white/70 mb-2">
                  Confirm New Password
                </label>
                <input
                  id="profile-confirm-password"
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="btn-secondary w-full"
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card p-6 mt-6 border-red-500/30">
          <h2 className="text-lg font-semibold mb-4 text-red-400">Danger Zone</h2>
          <p className="text-white/60 text-sm mb-4">
            Once you sign out, you'll need to log in again to access your trips.
          </p>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
          >
            Sign Out
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12 py-6">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center text-sm text-white/40">
          <span>© GroupTrips</span>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-white/60">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-white/60">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
