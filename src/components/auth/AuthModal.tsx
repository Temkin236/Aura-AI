import React, { useState } from 'react';
import { X, Lock, Mail, User, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { SafeUser } from '../../db/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: SafeUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/signin';
      const bodyData =
        mode === 'signup'
          ? { email: email.trim(), password, displayName: displayName.trim() || undefined }
          : { email: email.trim(), password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(bodyData),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // In case the response is not valid JSON
      }

      if (!res.ok) {
        const errorMsg =
          data?.error ||
          (res.status === 401
            ? 'Invalid email or password.'
            : res.status === 409
            ? 'An account with this email address already exists.'
            : res.status === 400
            ? 'Invalid request. Please check your credentials and password requirements.'
            : `Authentication failed (${res.status}). Please try again.`);
        throw new Error(errorMsg);
      }

      if (data?.user) {
        onAuthSuccess(data.user);
        onClose();
        // Reset form
        setEmail('');
        setPassword('');
        setDisplayName('');
      } else {
        throw new Error('No user data returned from authentication server.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#17110E]/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8] dark:border-[#3A2921] shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-[#EDE1D5] dark:border-[#2B1D17]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#EDE1D5]/70 dark:bg-[#2B1D17] flex items-center justify-center text-[#C7A46A]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium text-[#2B1D17] dark:text-[#FCFAF7]">
                {mode === 'signin' ? 'Sign In to AURA' : 'Create an Account'}
              </h2>
              <p className="text-[11px] text-[#8A6756] dark:text-[#8A6756] tracking-wide">
                {mode === 'signin' ? 'Welcome back to your workspace' : 'Join AURA to save your conversations'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A6756] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4">
          <div className="flex rounded-xl bg-[#EDE1D5]/50 dark:bg-[#17110E] p-1 border border-[#DCC9B8]/40 dark:border-[#3A2921]">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'signin'
                  ? 'bg-[#FCFAF7] dark:bg-[#2B1D17] text-[#2B1D17] dark:text-[#FCFAF7] shadow-xs'
                  : 'text-[#8A6756] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-[#FCFAF7] dark:bg-[#2B1D17] text-[#2B1D17] dark:text-[#FCFAF7] shadow-xs'
                  : 'text-[#8A6756] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7]'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-[#4A3026] dark:text-[#DCC9B8] mb-1.5">
                Display Name (Optional)
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A7A70]" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Leonardo da Vinci"
                  maxLength={100}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#EDE1D5]/40 dark:bg-[#17110E] border border-[#DCC9B8]/70 dark:border-[#3A2921] text-[#2B1D17] dark:text-[#EDE1D5] placeholder:text-[#8A7A70] focus:outline-none focus:border-[#C7A46A] transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#4A3026] dark:text-[#DCC9B8] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A7A70]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#EDE1D5]/40 dark:bg-[#17110E] border border-[#DCC9B8]/70 dark:border-[#3A2921] text-[#2B1D17] dark:text-[#EDE1D5] placeholder:text-[#8A7A70] focus:outline-none focus:border-[#C7A46A] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#4A3026] dark:text-[#DCC9B8] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A7A70]" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#EDE1D5]/40 dark:bg-[#17110E] border border-[#DCC9B8]/70 dark:border-[#3A2921] text-[#2B1D17] dark:text-[#EDE1D5] placeholder:text-[#8A7A70] focus:outline-none focus:border-[#C7A46A] transition-colors"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2B1D17] dark:bg-[#FCFAF7] text-[#FCFAF7] dark:text-[#2B1D17] hover:bg-[#4A3026] dark:hover:bg-[#EDE1D5] active:scale-98 text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs min-h-[42px]"
            >
              <span>{isLoading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
              {!isLoading && <ArrowRight className="w-3.5 h-3.5 text-[#C7A46A]" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
