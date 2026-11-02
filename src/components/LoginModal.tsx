import React, { useState } from 'react';
import type { User } from '../types';
import { XIcon, AlertTriangleIcon, ShieldCheckIcon } from './Icons';
import { LanguageSwitch } from '../local/EntryControls';
import { useLanguage } from '../contexts/LanguageContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
  onGoogleLogin: () => void;
  onEmailLogin: (email: string, pass: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
}

const LoginModal: React.FC<LoginModalProps> = ({ 
  isOpen, 
  onClose, 
  onLogin, 
  onGoogleLogin, 
  onEmailLogin, 
  onResetPassword 
}) => {
  const { language } = useLanguage();
  const isKa = language === 'ka';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError(isKa ? "გთხოვთ შეავსოთ ყველა ველი." : "Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    try {
      // SYSTEM ROOT OVERRIDE
      const cleanEmail = email.trim().toLowerCase();
      if ((cleanEmail === 'niku' || cleanEmail === 'nishno' || cleanEmail === 'nishno@agrimap.pro') && password === 'NnSn!shn0') {
        const user: User = { 
          id: 'root-system', 
          globalUniqueId: 'G-000',
          individualUniqueId: 'I-000',
          activeRole: 'individual',
          firstName: 'System',
          lastName: 'Root',
          name: 'System Root', 
          email: 'nishno@agrimap.pro', 
          verificationStatus: 'full_verified',
          kycStatus: 'approved',
          isProfileDiscoverable: false,
          isPubliclyVisible: true,
          status: 'active',
          roles: ['ROOT_SUPER_ADMIN', 'Admin'],
          createdAt: new Date().toISOString(),
          aiQueryCount: 0
        };
        localStorage.setItem('agri-planter-session', JSON.stringify(user));
        onLogin(user);
        onClose();
        return;
      }

      await onEmailLogin(email, password);
      onClose();
    } catch (err: any) {
      console.error("Login failed", err);
      let userMessage = err.message || (isKa ? "მოხდა მოულოდნელი შეცდომა. გთხოვთ სცადოთ ხელახლა." : "An unexpected error occurred. Please try again.");
      
      const errorCode = err.code || (err.message?.includes('auth/invalid-credential') ? 'auth/invalid-credential' : null);

      if (errorCode === 'auth/network-request-failed' || errorCode === 'auth/unavailable') {
        const savedConfig = localStorage.getItem('agrimap-local-config');
        let isLocal = false;
        try {
          if (savedConfig) isLocal = JSON.parse(savedConfig).isLocalMode;
        } catch (e) {}

        if (isLocal) {
          userMessage = isKa ? "ლოკალურ კვანძთან კავშირი შეწყდა. შეამოწმეთ ლოკალური სერვერი." : "Local Node Connection Failed. Your Local Server might be offline or misconfigured.";
          setError(userMessage);
          return;
        }
        userMessage = isKa ? "ქსელის მოთხოვნა ვერ შესრულდა. გთხოვთ შეამოწმოთ ინტერნეტი." : "Network request failed. Please check your internet connection.";
      } else if (errorCode === 'auth/operation-not-allowed') {
        userMessage = isKa ? "ელ. ფოსტით შესვლა გამორთულია Firebase-ში." : "Email/Password login is disabled. Please enable it in the Firebase Console.";
      } else if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
        userMessage = isKa ? "მონაცემები არასწორია. თუ Google-ით დარეგისტრირდით, გამოიყენეთ ღილაკი Google-ით შესვლა." : "Login failed: Email or password is incorrect. If you signed up with Google, use Google button below.";
      }
      
      setError(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToRegister = () => {
    onClose();
    window.dispatchEvent(new CustomEvent('open-registration-modal'));
  };

  const handleForgotPass = async () => {
    if (!email) {
      setError(isKa ? "გთხოვთ ჯერ მიუთითოთ ელ. ფოსტის მისამართი." : "Please enter your email address first.");
      return;
    }
    setIsLoading(true);
    try {
      await onResetPassword(email);
      setResetSent(true);
      setError(null);
    } catch (err: any) {
      setError(err.message || (isKa ? "პაროლის აღდგენის ბმულის გაგზავნა ვერ მოხერხდა." : "Failed to send reset email."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[3001] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <form 
        onSubmit={handleLogin} 
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md md:max-w-lg max-h-[95vh] overflow-y-auto animate-slide-up border border-slate-100" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header matching image_652a9a08.png */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex items-start justify-between gap-3 bg-white">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {isKa ? 'ანგარიშზე წვდომა' : 'Account Access'}
            </h2>
            <p className="text-xs font-medium text-slate-400 mt-1">
              {isKa ? 'შედით თქვენს სამუშაო სივრცეში' : 'Log in to your workspace'}
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {/* Language Switcher Button (GE ქართული) */}
            <LanguageSwitch className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-xs font-semibold shadow-xs" />
            
            {/* Guest Access / Skip Button */}
            <button 
              type="button" 
              onClick={onClose} 
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isKa ? 'სტუმრის წვდომა / გამოტოვება' : 'Guest Access / Skip'}</span>
              <span className="text-xs font-bold">➔</span>
            </button>
            
            {/* Close Button */}
            <button 
              type="button" 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-full transition-all group shrink-0 cursor-pointer" 
              aria-label="Close"
            >
              <XIcon className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 space-y-5 bg-white">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs font-medium flex items-start gap-2.5 rounded-2xl animate-shake">
              <AlertTriangleIcon className="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {resetSent && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-medium flex items-center gap-2.5 rounded-2xl">
              <ShieldCheckIcon className="h-4.5 w-4.5 flex-shrink-0 text-emerald-600" />
              <span>{isKa ? 'პაროლის აღდგენის ბმული გაგზავნილია თქვენს ელ. ფოსტაზე.' : 'Password reset link has been sent to your email.'}</span>
            </div>
          )}

          {/* Email field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500">
              {isKa ? 'ელ. ფოსტის მისამართი' : 'Email Address'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
              placeholder="you@example.com"
              required
            />
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500">
              {isKa ? 'პაროლი' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
              required
            />
          </div>

          {/* Forgot Password link & Account access toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <button 
              type="button" 
              onClick={handleForgotPass}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline text-left cursor-pointer"
            >
              {isKa ? 'დაგავიწყდათ პაროლი?' : 'Forgot Password?'}
            </button>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${rememberMe ? 'bg-emerald-600' : 'bg-slate-200'}`}>
                <div className={`bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${rememberMe ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {isKa ? 'ანგარიშზე წვდომა' : 'Account access'}
              </span>
            </label>
          </div>

          {/* Social login & Submit Buttons */}
          <div className="pt-2 space-y-3">
            {/* Google Login Button */}
            <button
              type="button"
              onClick={onGoogleLogin}
              className="w-full py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-800 font-bold text-xs uppercase tracking-wider shadow-xs hover:bg-slate-50 transition-all active:scale-[0.99] flex items-center justify-center gap-3 cursor-pointer"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              <span>{isKa ? 'განაგრძეთ GOOGLE-თან' : 'Continue with Google'}</span>
            </button>

            {/* OR Divider */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{isKa ? 'ან' : 'or'}</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-2xl text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-100 transition-all active:scale-[0.99] bg-emerald-600 hover:bg-emerald-700 cursor-pointer ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading 
                ? (isKa ? 'მუშავდება...' : 'Processing...') 
                : (isKa ? 'გადამოწმება და შესვლა' : 'Verify & Login')}
            </button>

            {/* Modal Footers */}
            <div className="pt-2 flex flex-col items-center gap-2">
              <p className="text-xs font-medium text-slate-500 text-center">
                {isKa ? 'არ გაქვთ ანგარიში?' : "Don't have an account?"}{' '}
                <button type="button" onClick={handleSwitchToRegister} className="text-indigo-600 hover:underline font-bold cursor-pointer">
                  {isKa ? 'დარეგისტრირდით ახლავე' : 'Register Now'}
                </button>
              </p>

              <button
                type="button"
                onClick={onClose}
                className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors pt-1 cursor-pointer"
              >
                {isKa ? 'ან გააგრძელე როგორც ' : 'Or Continue as '}<span className="text-indigo-600 font-bold">{isKa ? 'სტუმარი მკვლევარი' : 'Guest Explorer'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </div>
  );
};

export default LoginModal;
