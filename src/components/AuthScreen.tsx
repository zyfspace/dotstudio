import React, { useState } from 'react';
import { Icon } from '@/components/Icons';
import { DotStudioPaperLogo } from '@/components/Logo';
import { AuthUser, verifyLogin, registerUser, setAuthSession } from '@/lib/auth';
import { InteractiveAuthBg } from '@/components/InteractiveAuthBg';

interface AuthScreenProps {
  onSuccess: (user: AuthUser) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  initialMode?: 'login' | 'signup' | 'forgot';
  initialEmail?: string;
  onBackToLanding?: () => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

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
  
  const [errorName, setErrorName] = useState('');
  const [errorEmail, setErrorEmail] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ title: string; desc: string } | null>(null);

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
  };

  const switchMode = (m: AuthMode) => {
    setMode(m);
    clearErrors();
    setSuccessInfo(null);
  };

  const handleSubmit = (e?: React.FormEvent) => {
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

    if (mode !== 'forgot') {
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
      setTimeout(() => {
        const res = verifyLogin(cleanEmail, password);
        setIsSubmitting(false);
        if (res.success && res.user) {
          setAuthSession(res.user, rememberMe);
          onSuccess(res.user);
        } else {
          setErrorPassword(res.error || 'Email or password incorrect.');
        }
      }, 400);
    } else if (mode === 'signup') {
      setTimeout(() => {
        const res = registerUser(cleanName, cleanEmail, password, studioName);
        setIsSubmitting(false);
        if (res.success && res.user) {
          setAuthSession(res.user, rememberMe);
          onSuccess(res.user);
        } else {
          setErrorEmail(res.error || 'Registration failed.');
        }
      }, 400);
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
              <p className="fine">Demo mode — enter your registered password to log in.</p>
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
                    placeholder="you@example.com"
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
                        Forgot password?
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
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      placeholder="••••••••"
                      style={{ paddingRight: '42px' }}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorPassword) setErrorPassword('');
                      }}
                      aria-invalid={!!errorPassword}
                    />
                    <button
                      className="eye"
                      type="button"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <Icon name={showPassword ? 'eyeoff' : 'eye'} size={16} />
                    </button>
                  </div>
                  {errorPassword && <div className="er">{errorPassword}</div>}

                  {/* Password strength meter */}
                  {mode === 'signup' && (
                    <>
                      <div className="meter">
                        <i className={passwordScore >= 1 ? 'on' : ''} />
                        <i className={passwordScore >= 2 ? 'on' : ''} />
                        <i className={passwordScore >= 3 ? 'on' : ''} />
                        <i className={passwordScore >= 4 ? 'on' : ''} />
                      </div>
                      <div className="mt">
                        {password
                          ? `Password strength: ${strengthLabels[Math.max(passwordScore, 1)]}`
                          : 'Use 8+ characters with a mix of letters, numbers and symbols.'}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Remember me checkbox */}
              {mode === 'login' && (
                <label className="ck">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <i>
                    <Icon name="check" size={12} className="i" />
                  </i>
                  <span>Remember me on this device</span>
                </label>
              )}

              {/* Submit button */}
              <button
                type="submit"
                className="btn pri"
                style={{ marginTop: '6px' }}
                disabled={isSubmitting}
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
                    onClick={() => {
                      // Google login pre-populates with default registered user
                      setEmail('zyfxspace@gmail.com');
                      setPassword('11januari');
                      const res = verifyLogin('zyfxspace@gmail.com', '11januari');
                      if (res.success && res.user) {
                        setAuthSession(res.user, true);
                        onSuccess(res.user);
                      }
                    }}
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
