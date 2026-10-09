'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/Icons';
import { DotStudioPaperLogo } from '@/components/Logo';
import { OtpInput } from '@/components/OtpInput';
import {
  AuthUser,
  verifyLogin,
  registerUser,
  setAuthSession,
  signInWithGoogle,
  signUpWithSupabase,
  verifyOtpWithSupabase,
  resendOtpWithSupabase,
} from '@/lib/auth';
import { InteractiveAuthBg } from '@/components/InteractiveAuthBg';

interface AuthScreenProps {
  onSuccess: (user: AuthUser) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  initialMode?: 'login' | 'signup' | 'forgot' | 'otp';
  initialEmail?: string;
  onBackToLanding?: () => void;
}

type AuthMode = 'login' | 'signup' | 'forgot' | 'otp';

export function AuthScreen({
  onSuccess,
  theme,
  onToggleTheme,
  initialMode = 'login',
  initialEmail = '',
  onBackToLanding,
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [studioName, setStudioName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  const [errorName, setErrorName] = useState('');
  const [errorEmail, setErrorEmail] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ title: string; desc: string } | null>(null);

  // OTP cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const calculatePasswordScore = (v: string): number => {
    let score = 0;
    if (v.length >= 8) score++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    return score;
  };

  const passwordScore = calculatePasswordScore(password);
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  const clearErrors = () => {
    setErrorName('');
    setErrorEmail('');
    setErrorPassword('');
    setOtpError('');
  };

  const switchMode = (m: AuthMode) => {
    setMode(m);
    clearErrors();
    setSuccessInfo(null);
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    clearErrors();
    const res = await signInWithGoogle();
    if (!res.success) {
      setIsSubmitting(false);
      setErrorEmail(res.error || 'Failed to initialize Google login.');
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || otpCode).trim();
    if (code.length !== 6) {
      setOtpError('Please enter all 6 digits of the verification code.');
      return;
    }
    setIsVerifyingOtp(true);
    setOtpError('');
    const res = await verifyOtpWithSupabase(email, code, name, studioName, password);
    setIsVerifyingOtp(false);
    if (res.success && res.user) {
      onSuccess(res.user);
    } else {
      setOtpError(res.error || 'Invalid or expired verification code.');
    }
  };

  const handleResendOtp = async () => {
    if (otpCooldown > 0 || isResendingOtp) return;
    setIsResendingOtp(true);
    setOtpError('');
    const res = await resendOtpWithSupabase(email);
    setIsResendingOtp(false);
    if (res.success) {
      setOtpCooldown(30);
    } else {
      setOtpError(res.error || 'Failed to resend code. Please try again.');
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearErrors();

    let valid = true;
    const cleanEmail = email.trim();
    const cleanName = name.trim();

    if (mode === 'signup' && !cleanName) {
      setErrorName('Please enter your full name.');
      valid = false;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorEmail('Enter a valid email address.');
      valid = false;
    }

    if (mode !== 'forgot' && mode !== 'otp') {
      if (!password) {
        setErrorPassword('Enter your password.');
        valid = false;
      } else if (mode === 'signup' && password.length < 8) {
        setErrorPassword('Use at least 8 characters.');
        valid = false;
      }
    }

    if (!valid) return;

    setIsSubmitting(true);

    if (mode === 'login') {
      const res = verifyLogin(cleanEmail, password);
      setIsSubmitting(false);
      if (res.success && res.user) {
        setAuthSession(res.user, rememberMe);
        onSuccess(res.user);
      } else {
        setErrorPassword(res.error || 'Email or password incorrect.');
      }
    } else if (mode === 'signup') {
      const res = await signUpWithSupabase(cleanName, cleanEmail, password, studioName);
      setIsSubmitting(false);
      if (!res.success) {
        setErrorEmail(res.error || 'Registration failed.');
        return;
      }
      if (res.requiresOtp) {
        setMode('otp');
        setOtpCooldown(30);
      } else if (res.user) {
        setAuthSession(res.user, rememberMe);
        onSuccess(res.user);
      }
    } else if (mode === 'forgot') {
      setTimeout(() => {
        setIsSubmitting(false);
        setSuccessInfo({
          title: 'Check your email',
          desc: `If an account exists for ${cleanEmail}, a reset link is on its way.`,
        });
      }, 400);
    }
  };

  return (
    <div className="auth-root" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--fg)', position: 'relative', overflow: 'hidden' }}>
      <InteractiveAuthBg theme={theme} />
      {/* Header */}
      <header className="hd" style={{ position: 'relative', zIndex: 1 }}>
        <div
          className="brand"
          style={{ padding: 0, cursor: onBackToLanding ? 'pointer' : 'default', display: 'flex', alignItems: 'center' }}
          onClick={onBackToLanding}
          title={onBackToLanding ? 'Back to home' : undefined}
        >
          <DotStudioPaperLogo height={22} />
        </div>
        <button
          className="ib"
          id="th"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
        </button>
      </header>

      {/* Main Container */}
      <main className="pg" style={{ position: 'relative', zIndex: 1 }}>
        <div className="box">
          {successInfo ? (
            <div className="ok">
              <div className="ring">
                <Icon name="check" size={22} />
              </div>
              <h1>{successInfo.title}</h1>
              <p>{successInfo.desc}</p>
              <button
                className="btn"
                onClick={() => {
                  setSuccessInfo(null);
                  switchMode('login');
                }}
              >
                Back to log in
              </button>
            </div>
          ) : mode === 'otp' ? (
            <div key="otp-mode" className="auth-form-anim">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    border: '1px solid var(--line)',
                    background: 'var(--soft)',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 12px',
                    color: 'var(--fg)',
                  }}
                >
                  <Icon name="mail" size={20} />
                </div>
                <h1 style={{ fontSize: '22px' }}>Verify your email</h1>
                <p className="sub" style={{ margin: '4px 0 0', fontSize: '13.5px' }}>
                  Enter the 6-digit code sent to<br />
                  <b style={{ color: 'var(--fg)' }}>{email}</b>
                </p>
              </div>

              <OtpInput
                value={otpCode}
                onChange={(val) => {
                  setOtpCode(val);
                  if (otpError) setOtpError('');
                  if (val.length === 6) {
                    handleVerifyOtp(val);
                  }
                }}
                autoFocus
                disabled={isVerifyingOtp}
                hasError={Boolean(otpError)}
              />

              {otpError && (
                <div className="er" style={{ textAlign: 'center', margin: '-8px 0 14px' }}>
                  {otpError}
                </div>
              )}

              <button
                type="button"
                className="btn pri"
                onClick={() => handleVerifyOtp()}
                disabled={isVerifyingOtp || otpCode.length !== 6}
                style={{ marginTop: '8px' }}
              >
                {isVerifyingOtp ? 'Verifying…' : 'Verify & Continue'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', fontSize: '13px' }}>
                <button
                  type="button"
                  className="lk"
                  onClick={() => {
                    setMode('signup');
                    setOtpCode('');
                    setOtpError('');
                  }}
                >
                  Change email
                </button>

                <button
                  type="button"
                  className="lk"
                  onClick={handleResendOtp}
                  disabled={otpCooldown > 0 || isResendingOtp}
                  style={{ opacity: otpCooldown > 0 ? 0.6 : 1, cursor: otpCooldown > 0 ? 'default' : 'pointer' }}
                >
                  {isResendingOtp ? 'Sending…' : otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div key={mode} className="auth-form-anim">
                <h1>
                  {mode === 'login'
                    ? 'Welcome back'
                    : mode === 'signup'
                      ? 'Create your account'
                      : 'Reset password'}
                </h1>
                <p className="sub">
                  {mode === 'login'
                    ? 'Log in to manage your projects and payments.'
                    : mode === 'signup'
                      ? 'Start tracking projects, clients and payments.'
                      : 'Enter your email and we’ll send you a reset link.'}
                </p>

                {/* Segmented Mode Selector */}
                {mode !== 'forgot' && (
                  <div className="seg">
                    <button
                      type="button"
                      className={mode === 'login' ? 'on' : ''}
                      onClick={() => switchMode('login')}
                    >
                      Log in
                    </button>
                    <button
                      type="button"
                      className={mode === 'signup' ? 'on' : ''}
                      onClick={() => switchMode('signup')}
                    >
                      Sign up
                    </button>
                  </div>
                )}

                {/* Full Name field (Sign up only) */}
                {mode === 'signup' && (
                  <div className="f">
                    <div className="lbl">
                      <label htmlFor="nm">Full name</label>
                    </div>
                    <div className="fi">
                      <span className="ic">
                        <Icon name="user" size={16} />
                      </span>
                      <input
                        className="in"
                        id="nm"
                        type="text"
                        autoComplete="name"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (errorName) setErrorName('');
                        }}
                        aria-invalid={!!errorName}
                      />
                    </div>
                    {errorName && <div className="er">{errorName}</div>}
                  </div>
                )}

                {/* Email field */}
                <div className="f">
                  <div className="lbl">
                    <label htmlFor="em">Email</label>
                  </div>
                  <div className="fi">
                    <span className="ic">
                      <Icon name="mail" size={16} />
                    </span>
                    <input
                      className="in"
                      id="em"
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorEmail) setErrorEmail('');
                      }}
                      aria-invalid={!!errorEmail}
                    />
                  </div>
                  {errorEmail && <div className="er">{errorEmail}</div>}
                </div>

                {/* Password field */}
                {mode !== 'forgot' && (
                  <div className="f">
                    <div className="lbl">
                      <label htmlFor="pw">Password</label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          className="lk"
                          onClick={() => switchMode('forgot')}
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="fi">
                      <span className="ic">
                        <Icon name="lock" size={16} />
                      </span>
                      <input
                        className="in"
                        id="pw"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        placeholder={mode === 'login' ? 'Enter password' : 'At least 8 characters'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errorPassword) setErrorPassword('');
                        }}
                        aria-invalid={!!errorPassword}
                      />
                      <button
                        type="button"
                        className="eye"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <Icon name={showPassword ? 'eyeOff' : 'eye'} size={15} />
                      </button>
                    </div>

                    {/* Password Strength Meter (Sign up only) */}
                    {mode === 'signup' && password.length > 0 && (
                      <>
                        <div className="meter" aria-hidden="true">
                          {[1, 2, 3, 4].map((step) => (
                            <i
                              key={step}
                              className={passwordScore >= step ? 'on' : ''}
                            />
                          ))}
                        </div>
                        <div className="mt">
                          {strengthLabels[passwordScore] ? `Strength: ${strengthLabels[passwordScore]}` : ''}
                        </div>
                      </>
                    )}

                    {errorPassword && <div className="er">{errorPassword}</div>}
                  </div>
                )}

                {/* Remember Me */}
                {mode === 'login' && (
                  <label className="ck">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <i>
                      <Icon name="check" size={12} />
                    </i>
                    <span>Remember me</span>
                  </label>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn pri"
                  disabled={isSubmitting}
                  style={{ marginTop: mode === 'signup' ? '12px' : '0' }}
                >
                  {isSubmitting
                    ? 'Please wait…'
                    : mode === 'login'
                      ? 'Log in'
                      : mode === 'signup'
                        ? 'Create account'
                        : 'Send reset link'}
                </button>

                {mode === 'signup' && (
                  <p className="fine">
                    By creating an account you agree to the Terms and Privacy Policy.
                  </p>
                )}

                {mode !== 'forgot' && (
                  <>
                    <div className="or">or</div>
                    <button
                      type="button"
                      className="btn"
                      onClick={handleGoogleLogin}
                      disabled={isSubmitting}
                    >
                      <Icon name="google" size={16} />
                      <span>Continue with Google</span>
                    </button>
                  </>
                )}

                {/* Footer Switcher */}
                {mode === 'login' && (
                  <p className="ft">
                    Don’t have an account?
                    <button
                      type="button"
                      className="lk"
                      onClick={() => switchMode('signup')}
                    >
                      Sign up
                    </button>
                  </p>
                )}

                {mode === 'signup' && (
                  <p className="ft">
                    Already have an account?
                    <button
                      type="button"
                      className="lk"
                      onClick={() => switchMode('login')}
                    >
                      Log in
                    </button>
                  </p>
                )}

                {mode === 'forgot' && (
                  <p className="ft">
                    <button
                      type="button"
                      className="lk"
                      style={{ margin: 0 }}
                      onClick={() => switchMode('login')}
                    >
                      Back to log in
                    </button>
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default AuthScreen;
