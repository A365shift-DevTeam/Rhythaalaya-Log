import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconEye as Eye,
  IconEyeOff as EyeOff,
  IconLoader2 as Loader2,
  IconCheck as Check,
  IconMail as Mail,
  IconShieldCheck as ShieldCheck,
  IconLock as Lock,
  IconSchool as GraduationCap,
  IconCalendarCheck as CalendarCheck,
  IconArrowLeft as ArrowLeft
} from '@tabler/icons-react';
import { ApiError, api, Session } from '../api';

// Validate email regex
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Animated rotating words for Batch Management System
const ROTATING_WORDS = [
  'Batches',
  'Students',
  'Attendance',
  'Fee Logs',
  'Schedules',
  'Courses',
  'Reports'
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.12 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

interface LoginPageProps {
  onLogin?: (session: Session) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  // Step state: 'credentials' | 'otp'
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [otpCode, setOtpCode] = useState('');
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<any>(null);
  const [wordIndex, setWordIndex] = useState(0);

  // Clear cooldown on unmount
  useEffect(() => () => clearInterval(cooldownRef.current), []);

  // Text animation rotation timer
  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  function startResendCooldown(seconds = 60) {
    setResendCooldown(seconds);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }

  // Handle Initial Login Submission (Email & Password)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      const start = await api.login(email.trim(), password);
      if (!start.otpRequired) {
        if (start.session && onLogin) {
          onLogin(start.session);
        }
        return;
      }
      // OTP Required flow
      setPendingToken(start.pendingToken || null);
      setWrongAttempts(0);
      setStep('otp');
      setNotice(`We emailed a 6-digit verification code to ${email.trim()}.`);
      startResendCooldown(60);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error)?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  // Handle Email OTP Submission
  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingToken) return;
    setError('');

    const cleanCode = otpCode.trim();
    if (cleanCode.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }
    setLoading(true);

    try {
      const session = await api.verifyOtp(pendingToken, cleanCode);
      if (onLogin) {
        onLogin(session);
      }
    } catch (err) {
      setOtpCode('');
      if (err instanceof ApiError && err.status === 401) {
        const attempts = wrongAttempts + 1;
        if (attempts >= 5) {
          setPendingToken(null);
          setStep('credentials');
          setNotice('');
          setWrongAttempts(0);
          setError('Too many incorrect attempts. Please sign in again.');
          return;
        }
        setWrongAttempts(attempts);
      }
      setError(err instanceof ApiError ? err.message : (err as Error)?.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  }

  // Handle Resend OTP Code
  async function handleResendOtp() {
    if (!pendingToken || resending || resendCooldown > 0) return;
    setResending(true);
    setError('');
    try {
      const challenge = await api.resendOtp(pendingToken);
      setPendingToken(challenge.pendingToken);
      setNotice('A fresh verification code has been sent to your email.');
      startResendCooldown(60);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error)?.message || 'Unable to resend verification code.');
    } finally {
      setResending(false);
    }
  }

  function backToCredentials() {
    setStep('credentials');
    setPendingToken(null);
    setOtpCode('');
    setError('');
    setNotice('');
    setWrongAttempts(0);
  }

  const inputBase = [
    'w-full bg-white border rounded-lg px-3.5 text-[#152c5b] text-[13.5px]',
    'transition-all duration-200 outline-none mt-1 py-2.5',
    'placeholder:text-gray-400 placeholder:font-light'
  ].join(' ');

  const inputClass = (field: string) => [
    inputBase,
    focusedField === field
      ? 'border-[#58977c] ring-4 ring-[#58977c]/10 bg-[#f9fdfb]'
      : 'border-[#e8edf3] hover:border-[#c8d6e5]'
  ].join(' ');

  return (
    <div className="min-h-screen relative flex bg-[#fbfdfc] overflow-hidden" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      
      {/* Top Left Branding */}
      <div className="absolute top-8 left-8 z-20 flex items-center gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#152c5b] to-[#1e3f80] flex items-center justify-center text-white font-bold text-lg shadow-md shadow-[#152c5b]/15">
            B
          </div>
          <span className="font-bold text-[#152c5b] text-2xl tracking-tight" style={{ fontFamily: '"Manrope", sans-serif' }}>
            Batch<span className="text-[#58977c]">ly</span>
          </span>
        </div>
      </div>

      {/* Left Side Hero & Animation */}
      <div className="hidden lg:flex w-[50%] relative flex-col justify-center pl-24 xl:pl-36 z-10 -mt-10 antialiased font-sans">
        
        {/* Decorative ambient circles */}
        <motion.div
          animate={{ y: [0, -12, 0], opacity: [0.18, 0.28, 0.18] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[18%] right-[12%] w-44 h-44 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(88,151,124,0.28) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ y: [0, 10, 0], opacity: [0.12, 0.2, 0.12] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-[22%] right-[18%] w-28 h-28 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(21,44,91,0.22) 0%, transparent 70%)' }}
        />

        <h1 className="text-[44px] xl:text-[52px] text-[#152c5b] whitespace-nowrap mb-4 tracking-tight">
          <span className="font-bold" style={{ fontFamily: '"Manrope", sans-serif' }}>
            Batch<span className="text-[#58977c]">ly</span>
          </span>{' '}
          <span className="font-normal text-[#152c5b]">Hub</span>
        </h1>

        <div className="flex flex-col space-y-2.5 text-[#152c5b] pl-[84px] xl:pl-[94px]">
          <p className="font-bold text-[20px] xl:text-[22px] flex items-center gap-2" style={{ fontFamily: '"Manrope", sans-serif' }}>
            <span>Batch Management System</span>
            <span className="inline-block w-2 h-2 rounded-full bg-[#58977c] animate-pulse" />
          </p>
          <div className="flex items-center gap-2.5 font-normal text-[28px] xl:text-[32px] mt-1">
            <span>Manage</span>
            <span className="relative inline-block h-[1.4em] overflow-hidden" style={{ minWidth: '220px' }}>
              <AnimatePresence mode="wait">
                <motion.span
                  key={ROTATING_WORDS[wordIndex]}
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: '0%', opacity: 1 }}
                  exit={{ y: '-100%', opacity: 0 }}
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                  className="absolute left-0 top-0 text-[#58977c] font-semibold whitespace-nowrap"
                >
                  {ROTATING_WORDS[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </div>
        </div>

        {/* Hero Wave Ripple Animation */}
        <div className="flex justify-start pl-[110px] xl:pl-[120px] mt-28 xl:mt-32 relative">
          <div className="relative flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 4.5], opacity: [0.4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeOut', delay: 0 }}
              className="absolute w-[50px] h-[50px] rounded-full z-0"
              style={{
                border: '1.5px solid transparent',
                background: 'linear-gradient(to right, #408464, #58977c, #a3d9b8) border-box',
                WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'destination-out',
                maskComposite: 'exclude'
              }}
            />
            <motion.div
              animate={{ scale: [1, 4.5], opacity: [0.4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeOut', delay: 1.33 }}
              className="absolute w-[50px] h-[50px] rounded-full z-0"
              style={{
                border: '1.5px solid transparent',
                background: 'linear-gradient(to right, #408464, #58977c, #a3d9b8) border-box',
                WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'destination-out',
                maskComposite: 'exclude'
              }}
            />
            <motion.div
              animate={{ scale: [1, 4.5], opacity: [0.4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeOut', delay: 2.66 }}
              className="absolute w-[50px] h-[50px] rounded-full z-0"
              style={{
                border: '1.5px solid transparent',
                background: 'linear-gradient(to right, #408464, #58977c, #a3d9b8) border-box',
                WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'destination-out',
                maskComposite: 'exclude'
              }}
            />
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="w-[72px] h-[72px] bg-white rounded-2xl shadow-xl border border-[#58977c]/20 flex items-center justify-center relative z-10 text-[#58977c]"
            >
              <CalendarCheck size={32} />
            </motion.div>
          </div>
        </div>

        {/* Slogan */}
        <div className="absolute bottom-20 xl:bottom-24 left-24 xl:left-36 z-20">
          <p className="text-[#152c5b] text-[15px] xl:text-[16px] font-medium tracking-wide flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#58977c]" />
            Streamline Batches · Track Attendance · Manage with Harmony
          </p>
        </div>
      </div>

      {/* Right Side - Form Card */}
      <div className="w-full lg:w-[50%] flex items-center justify-center relative p-6 sm:p-8">
        
        {/* Ambient background glows */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-16 right-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, #58977c 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.09, 0.05] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute bottom-24 left-8 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, #152c5b 0%, transparent 70%)' }}
        />

        {/* Floating Card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white w-full max-w-[410px] relative z-10"
          style={{
            borderRadius: '24px',
            border: '1px solid rgba(21,44,91,0.08)',
            boxShadow: '0 32px 80px -12px rgba(21,44,91,0.16), 0 8px 32px -8px rgba(21,44,91,0.08), 0 0 0 1px rgba(255,255,255,0.9) inset'
          }}
        >
          {/* Top gradient accent line */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ borderRadius: '23px' }}>
            <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#408464] via-[#58977c] to-[#a3d9b8]" />
          </div>

          <div className="px-7 sm:px-8 pt-8 pb-6">
            
            {/* Header */}
            <motion.div variants={itemVariants} initial="hidden" animate="visible" className="flex items-center mb-6 gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#58977c]/10 flex items-center justify-center text-[#58977c] shrink-0">
                {step === 'credentials' ? <Lock size={20} /> : <Mail size={20} />}
              </div>
              <div className="overflow-hidden">
                <h2 className="text-[20px] font-semibold text-[#152c5b] leading-tight tracking-tight">
                  {step === 'credentials' ? 'Sign In' : 'Verify OTP'}
                </h2>
                <p className="text-[12px] text-gray-500 mt-0.5 font-light tracking-wide truncate">
                  {step === 'credentials' ? 'Access your academy batch portal' : (notice || `Code sent to ${email}`)}
                </p>
              </div>
            </motion.div>

            {/* Error Message Alert */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="mb-5 overflow-hidden"
                >
                  <div className="p-3 rounded-xl text-[12.5px] bg-red-50 text-red-600 border border-red-100 flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-red-600 text-[10px] font-bold">!</span>
                    </div>
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Forms Container */}
            <div className="relative">
              <AnimatePresence mode="wait">
                {step === 'credentials' ? (
                  <motion.form
                    key="creds"
                    onSubmit={handleSubmit}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, x: -16, transition: { duration: 0.2 } }}
                    className="pl-5 pr-1"
                  >
                    {/* Email Input */}
                    <motion.div variants={itemVariants} className="relative mb-4">
                      <div className="absolute -left-[20px] top-[7px] flex items-center justify-center w-3 h-3">
                        {isValidEmail(email) ? (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>
                            <Check size={14} strokeWidth={3.5} className="text-[#58977c]" />
                          </motion.div>
                        ) : (
                          <div className="w-[7px] h-[7px] rounded-full bg-[#6db68c]" />
                        )}
                      </div>
                      <label className="block text-[#152c5b] text-[12.5px] font-semibold tracking-wide mb-0">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField('')}
                        required
                        className={inputClass('email')}
                        placeholder="admin@batchly.com"
                        autoComplete="email"
                      />
                    </motion.div>

                    {/* Password Input */}
                    <motion.div variants={itemVariants} className="relative mb-4">
                      <div className="absolute -left-[20px] top-[7px] flex items-center justify-center w-3 h-3">
                        {password.length >= 6 ? (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>
                            <Check size={14} strokeWidth={3.5} className="text-[#58977c]" />
                          </motion.div>
                        ) : (
                          <div className="w-[7px] h-[7px] rounded-full bg-[#6db68c]" />
                        )}
                      </div>
                      <label className="block text-[#152c5b] text-[12.5px] font-semibold tracking-wide mb-0">
                        Password
                      </label>
                      <div className="relative w-full">
                        <input
                          type={showPw ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => setFocusedField('')}
                          required
                          className={inputClass('password')}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#58977c] transition-colors"
                          style={{ marginTop: '2px' }}
                          aria-label={showPw ? 'Hide password' : 'Show password'}
                        >
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </motion.div>

                    {/* Submit Button */}
                    <motion.div variants={itemVariants} className="flex justify-center mt-5">
                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: loading ? 1 : 1.02, boxShadow: loading ? undefined : '0 8px 24px rgba(88,151,124,0.35)' }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="bg-gradient-to-r from-[#4a8f70] to-[#5a9c7d] hover:from-[#408464] hover:to-[#4b886b] text-white w-full py-2.5 rounded-full font-semibold text-[13.5px] tracking-wide transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        style={{ boxShadow: '0 4px 16px rgba(88,151,124,0.25)' }}
                      >
                        {loading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={14} />}
                        <span>{loading ? 'Authenticating…' : 'Sign In'}</span>
                      </motion.button>
                    </motion.div>
                  </motion.form>
                ) : (
                  /* OTP Verification Form */
                  <motion.form
                    key="otp"
                    onSubmit={handleOtpSubmit}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, x: -16, transition: { duration: 0.2 } }}
                    className="pl-5 pr-1"
                  >
                    <motion.div variants={itemVariants} className="relative mb-4">
                      <div className="absolute -left-[20px] top-[7px] flex items-center justify-center w-3 h-3">
                        {otpCode.length === 6 ? (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>
                            <Check size={14} strokeWidth={3.5} className="text-[#58977c]" />
                          </motion.div>
                        ) : (
                          <div className="w-[7px] h-[7px] rounded-full bg-[#6db68c]" />
                        )}
                      </div>
                      <label className="block text-[#152c5b] text-[12.5px] font-semibold tracking-wide">
                        6-Digit One-Time Password
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        onFocus={() => setFocusedField('otp')}
                        onBlur={() => setFocusedField('')}
                        required
                        className={`${inputClass('otp')} tracking-[0.45em] font-bold text-center text-[16px]`}
                        autoFocus
                        placeholder="••••••"
                      />
                      <div className="flex justify-between items-center mt-2.5">
                        <button
                          type="button"
                          onClick={backToCredentials}
                          className="text-[12px] text-gray-500 hover:text-[#152c5b] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowLeft size={13} />
                          <span>Back to Login</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={resending || resendCooldown > 0}
                          className="text-[12px] text-[#58977c] hover:text-[#427b60] disabled:text-gray-400 font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          {resending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                        </button>
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="flex justify-center mt-5">
                      <motion.button
                        type="submit"
                        disabled={loading || otpCode.length !== 6}
                        whileHover={{ scale: loading || otpCode.length !== 6 ? 1 : 1.02, boxShadow: loading ? undefined : '0 8px 24px rgba(88,151,124,0.35)' }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-gradient-to-r from-[#4a8f70] to-[#5a9c7d] hover:from-[#408464] hover:to-[#4b886b] text-white w-full py-2.5 rounded-full font-semibold text-[13.5px] tracking-wide transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        style={{ boxShadow: '0 4px 16px rgba(88,151,124,0.2)' }}
                      >
                        {loading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                        <span>{loading ? 'Verifying OTP…' : 'Verify & Continue'}</span>
                      </motion.button>
                    </motion.div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Academy Security & Trust Strip */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium leading-tight">
                <ShieldCheck size={20} className="text-[#58977c] opacity-80 shrink-0" />
                <span>SSL<br />Secured</span>
              </div>
              <div className="w-px h-6 bg-gray-200" />
              <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium leading-tight">
                <Mail size={20} className="text-[#58977c] opacity-80 shrink-0" />
                <span>Email OTP<br />Verified</span>
              </div>
              <div className="w-px h-6 bg-gray-200" />
              <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium leading-tight">
                <GraduationCap size={20} className="text-[#58977c] opacity-80 shrink-0" />
                <span>Academy<br />Grade</span>
              </div>
            </div>

          </div>
        </motion.div>
      </div>

      {/* Slogan for Mobile Devices */}
      <div className="lg:hidden absolute bottom-5 left-0 right-0 text-center z-20 px-4">
        <p className="text-[#152c5b] text-[12.5px] font-medium opacity-70">
          Batchly · Streamline Batches & Operations
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
