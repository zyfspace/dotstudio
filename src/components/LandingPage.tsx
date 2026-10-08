'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/Icons';
import { DotStudioPaperLogo } from '@/components/Logo';
import '@/app/landing.css';

interface LandingPageProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenAuth: (mode: 'login' | 'signup', prefillEmail?: string) => void;
}

const PRESET_SCHEMES: Record<string, [string, number][]> = {
  'Full payment': [['Full payment', 100]],
  'DP 50 / 50': [
    ['DP', 50],
    ['Final payment', 50],
  ],
  '3 installments': [
    ['DP', 30],
    ['Progress', 40],
    ['Final payment', 30],
  ],
};

const FEATURES = [
  {
    icon: 'check',
    title: 'Status that updates itself',
    desc: 'Pending, In progress, Finished. Derived from payments, never typed by hand.',
  },
  {
    icon: 'cal',
    title: 'Payment schedules',
    desc: 'DP 50/50, three installments or custom. Always totals exactly 100%.',
  },
  {
    icon: 'upload',
    title: 'Proof of payment',
    desc: 'Upload the receipt and the installment is marked paid, with a date and a file.',
  },
  {
    icon: 'file',
    title: 'Invoices & quotations',
    desc: 'Numbered documents from your data. Convert a quotation to a project in one click.',
  },
  {
    icon: 'users',
    title: 'Every client in one place',
    desc: 'Contact details, notes, total value, what’s paid and what’s left.',
  },
  {
    icon: 'sun',
    title: 'Light and dark',
    desc: 'Calm in both. Follows your system, or switch it yourself.',
  },
];

const FLOW_STEPS = [
  {
    icon: 'file',
    title: 'Quotation',
    desc: 'Send a clear quote. When the client says yes, convert it to a project in one click.',
  },
  {
    icon: 'folder',
    title: 'Project',
    desc: 'The payment scheme comes with it: DP 50/50, three installments, or your own.',
  },
  {
    icon: 'file',
    title: 'Invoice',
    desc: 'Create an invoice straight from any installment. Numbered and ready to send.',
  },
  {
    icon: 'wallet',
    title: 'Paid',
    desc: 'Upload the proof of payment. Progress moves and the project finishes itself.',
  },
];

export function LandingPage({ theme, onToggleTheme, onOpenAuth }: LandingPageProps) {
  const TOTAL_VALUE = 12000000;
  const [currentScheme, setCurrentScheme] = useState<string>('DP 50 / 50');
  const [paidInstallments, setPaidInstallments] = useState<Record<number, boolean>>({});
  const [animatedAmount, setAnimatedAmount] = useState<number>(0);
  const [emailInput, setEmailInput] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');

  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [flowProgress, setFlowProgress] = useState<number>(0);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const rigRef = useRef<HTMLDivElement | null>(null);
  const toastRef = useRef<HTMLDivElement | null>(null);
  const flowRef = useRef<HTMLDivElement | null>(null);
  const heroProgressRef = useRef<HTMLElement | null>(null);

  const formatRp = (num: number) => {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(num));
  };

  // 1. Reveal on scroll (.rv)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );

    const elements = document.querySelectorAll('.landing-page .rv');
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        el.classList.add('in');
      } else {
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, []);

  // 2. 3D Hero Rig Animation
  useEffect(() => {
    let animationFrameId: number;
    let px = 0;
    let py = 0;
    let cx = 0;
    let cy = 0;
    let hovering = false;

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      px = Math.max(-1, Math.min(1, (e.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2)));
      py = Math.max(-1, Math.min(1, (e.clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2)));
      hovering = true;
    };

    window.addEventListener('pointermove', handlePointerMove);

    const layers = document.querySelectorAll<HTMLElement>('.landing-page .mc.ly');

    const frame = (t: number) => {
      const scrollY = window.scrollY || 0;
      const p = Math.max(0, Math.min(1, scrollY / 560));
      const tx = hovering ? px : Math.sin(t / 2200) * 0.55;
      const ty = hovering ? py : Math.cos(t / 2900) * 0.4;

      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;

      if (rigRef.current) {
        rigRef.current.style.transform = `rotateX(${10 - cy * 7 + p * 8}deg) rotateY(${-18 + cx * 12 - p * 6}deg) translateY(${-p * 24}px)`;
      }

      layers.forEach((layer, i) => {
        const baseZ = +(layer.dataset.z || 0);
        const baseX = +(layer.dataset.x || 0);
        const baseY = +(layer.dataset.y || 0);
        const z = baseZ * (1 + p * 1.4);
        const f = Math.sin(t / 1500 + i * 1.3) * 4;
        layer.style.transform = `translate3d(${baseX}px, ${baseY + f - p * 10 * i}px, ${z}px)`;
      });

      animationFrameId = requestAnimationFrame(frame);
    };

    animationFrameId = requestAnimationFrame(frame);

    const timer = setTimeout(() => {
      if (heroProgressRef.current) {
        heroProgressRef.current.style.width = '50%';
      }
    }, 500);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timer);
    };
  }, []);

  // 3. Periodic Toast
  useEffect(() => {
    let timeout1: NodeJS.Timeout | undefined;

    const showToast = () => {
      if (toastRef.current) {
        toastRef.current.classList.add('show');
        timeout1 = setTimeout(() => {
          if (toastRef.current) toastRef.current.classList.remove('show');
        }, 2600);
      }
    };

    const interval = setInterval(showToast, 4600);
    const initialTimer = setTimeout(showToast, 1600);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimer);
      if (timeout1) clearTimeout(timeout1);
    };
  }, []);

  // 4. Scroll listener for nav & flow
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);

      if (flowRef.current) {
        const r = flowRef.current.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = Math.max(0, Math.min(1, (vh * 0.78 - r.top) / (r.height + vh * 0.1)));
        setFlowProgress(p);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 5. Interactive Demo
  const planRows = PRESET_SCHEMES[currentScheme] || [];
  let calculatedReceived = 0;
  let paidCount = 0;

  planRows.forEach((r, i) => {
    if (paidInstallments[i]) {
      calculatedReceived += (TOTAL_VALUE * r[1]) / 100;
      paidCount++;
    }
  });

  const isAllPaid = paidCount === planRows.length;
  const isPartiallyPaid = paidCount > 0 && !isAllPaid;
  const demoStatusClass = isAllPaid ? 'Finished' : isPartiallyPaid ? 'Progress' : '';
  const demoStatusLabel = isAllPaid ? 'Finished' : isPartiallyPaid ? 'In progress' : 'Pending';
  const progressPercent = (calculatedReceived / TOTAL_VALUE) * 100;

  useEffect(() => {
    let raf: number;
    const startVal = animatedAmount;
    const endVal = calculatedReceived;
    const startTime = performance.now();
    const duration = 500;

    const step = (now: number) => {
      const elapsed = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - elapsed, 3);
      setAnimatedAmount(startVal + (endVal - startVal) * ease);
      if (elapsed < 1) {
        raf = requestAnimationFrame(step);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [calculatedReceived]);

  const handleMarkPaid = (index: number) => {
    if (!paidInstallments[index]) {
      setPaidInstallments((prev) => ({ ...prev, [index]: true }));
    }
  };

  const handleResetDemo = () => {
    setPaidInstallments({});
  };

  const handleSchemeChange = (schemeName: string) => {
    setCurrentScheme(schemeName);
    setPaidInstallments({});
  };

  const handleJoinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = emailInput.trim();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError('');
    onOpenAuth('signup', clean);
  };

  return (
    <div className="landing-page">
      {/* Navigation */}
      <header className={`nav ${isScrolled ? 's' : ''}`}>
        <div className="wrap">
          <div className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
            <DotStudioPaperLogo height={22} />
          </div>
          <div className="nav-links">
            <a className="l" href="#demo">Try it</a>
            <a className="l" href="#features">Features</a>
            <a className="l" href="#flow">How it flows</a>
          </div>
          <div className="nav-actions">
            <button
              className="ib"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
            </button>
            <button className="btn gh" onClick={() => onOpenAuth('login')}>
              Log in
            </button>
            <button className="btn pri" onClick={() => onOpenAuth('signup')}>
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="wrap">
          <div className="hero-content">
            <div className="tagl rv">
              <i />
              For everyone who get paid in installments
            </div>
            <h1 className="big rv" style={{ transitionDelay: '.05s' }}>
              Know exactly what you’re owed<em>.</em>
            </h1>
            <p className="lead rv" style={{ transitionDelay: '.12s' }}>
              DotStudio keeps your projects, clients and payments in one quiet place. Mark a payment received and the project status updates itself.
            </p>
            <div className="cta rv" style={{ transitionDelay: '.2s' }}>
              <button className="btn pri lg" onClick={() => onOpenAuth('signup')}>
                Get started <Icon name="arrow" size={16} />
              </button>
              <a className="btn lg" href="#demo">
                Try it live
              </a>
            </div>
          </div>

          {/* 3D Stage */}
          <div className="stage" id="stage" ref={stageRef}>
            <div className="rig" id="rig" ref={rigRef}>
              <div className="floor" />

              {/* Layer 1: Main Project Card */}
              <div className="mc ly" data-x="20" data-y="80" data-z="0" style={{ width: '350px' }}>
                <div className="row">
                  <div>
                    <b>Website redesign</b>
                    <div className="mut">Nadia Pratama · Lumen Studio</div>
                  </div>
                  <span className="st Progress">In progress</span>
                </div>
                <div className="amt">
                  Rp 9.250.000 <span>of Rp 18.500.000</span>
                </div>
                <div className="prog">
                  <i ref={heroProgressRef} style={{ width: '0%' }} />
                </div>
                <div className="ins" style={{ marginTop: '16px' }}>
                  <span>
                    <span className="chk">
                      <Icon name="check" size={10} />
                    </span>
                    DP · 50%
                  </span>
                  <span className="mut">Paid 12 Sep</span>
                </div>
                <div className="ins">
                  <span>Final payment · 50%</span>
                  <span className="mut">Due 21 Oct</span>
                </div>
              </div>

              {/* Layer 2: Upcoming payments */}
              <div className="mc ly" data-x="250" data-y="-6" data-z="70" style={{ width: '250px' }}>
                <div className="mut" style={{ marginBottom: '8px' }}>Upcoming payments</div>
                <div className="row" style={{ padding: '7px 0', borderTop: '1px solid var(--line)' }}>
                  <span>
                    Booking automation
                    <div className="mut">Final · due 12 Nov</div>
                  </span>
                  <b>Rp 7 jt</b>
                </div>
                <div className="row" style={{ padding: '7px 0', borderTop: '1px solid var(--line)' }}>
                  <span>
                    SEO content plan
                    <div className="mut" style={{ color: 'var(--ac)' }}>Final · overdue</div>
                  </span>
                  <b>Rp 3,6 jt</b>
                </div>
              </div>

              {/* Layer 3: Invoice preview */}
              <div className="mc ly" data-x="0" data-y="330" data-z="115" style={{ width: '240px' }}>
                <div className="row">
                  <span className="mut">INV-2026-001</span>
                  <span className="st">Unpaid</span>
                </div>
                <div style={{ margin: '10px 0 2px' }}>
                  <b>Final payment · 50%</b>
                </div>
                <div className="mut">Website redesign</div>
                <div className="amt" style={{ fontSize: '18px', margin: '10px 0 0' }}>
                  Rp 9.250.000
                </div>
              </div>

              {/* Layer 4: Toast notification */}
              <div className="mc ly toast" id="toast" ref={toastRef} data-x="238" data-y="392" data-z="170" style={{ width: '236px' }}>
                <span className="ring">
                  <Icon name="upload" size={13} />
                </span>
                <div>
                  <b>Proof uploaded</b>
                  <div className="mut">Final payment · just now</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo">
        <div className="wrap demo">
          <div>
            <div className="eyebrow rv">Try it</div>
            <h2 className="t rv" style={{ transitionDelay: '.05s' }}>
              A project that updates itself.
            </h2>
            <p className="sub rv" style={{ transitionDelay: '.1s' }}>
              Pick a payment scheme, then confirm each payment. Watch the status, progress and balance change on their own. There is nothing to edit by hand.
            </p>
          </div>

          <div className="pn rv" style={{ transitionDelay: '.12s' }}>
            <div className="chips">
              {Object.keys(PRESET_SCHEMES).map((schemeKey) => (
                <button
                  key={schemeKey}
                  type="button"
                  className={`chip ${schemeKey === currentScheme ? 'on' : ''}`}
                  onClick={() => handleSchemeChange(schemeKey)}
                >
                  {schemeKey}
                </button>
              ))}
            </div>

            <div className="row">
              <div>
                <b>Brand identity</b>
                <div className="mut">Kopi Sudut · {formatRp(TOTAL_VALUE)}</div>
              </div>
              <span className={`st ${demoStatusClass}`}>
                {demoStatusLabel}
              </span>
            </div>

            <div className="amt">
              {formatRp(animatedAmount)} <span>received</span>
            </div>

            <div className="prog">
              <i
                className={isAllPaid ? 'finished' : ''}
                style={{
                  width: `${progressPercent}%`,
                  transition: 'width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
              />
            </div>

            <div style={{ marginTop: '14px' }}>
              {planRows.map((r, i) => {
                const isPaid = !!paidInstallments[i];
                const rowAmount = (TOTAL_VALUE * r[1]) / 100;
                return (
                  <div
                    key={`${currentScheme}-${i}`}
                    className="irow"
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    <div>
                      <b>{r[0]}</b> <span className="mut">{r[1]}%</span>
                      <div className="mut">{formatRp(rowAmount)}</div>
                    </div>
                    <button
                      type="button"
                      className={`sm ${isPaid ? 'paid' : 'go'}`}
                      onClick={() => handleMarkPaid(i)}
                      disabled={isPaid}
                    >
                      {isPaid ? (
                        <>
                          <Icon name="check" size={14} />
                          <span>Paid</span>
                        </>
                      ) : (
                        <>
                          <Icon name="upload" size={14} />
                          <span>Upload proof</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="note">
              <span>
                {isAllPaid
                  ? 'All payments received. Status finished itself.'
                  : `${formatRp(TOTAL_VALUE - calculatedReceived)} remaining`}
              </span>
              <button type="button" className="lk" onClick={handleResetDemo}>
                Reset
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" style={{ paddingTop: '24px' }}>
        <div className="wrap">
          <div className="eyebrow rv">What’s inside</div>
          <h2 className="t rv" style={{ transitionDelay: '.05s' }}>
            Everything a payment-driven practice needs. Nothing it doesn’t.
          </h2>
          <div className="grid">
            {FEATURES.map((feat, i) => (
              <div
                key={feat.title}
                className="fc rv"
                style={{ transitionDelay: `${(i % 3) * 0.07}s` }}
              >
                <div className="ic">
                  <Icon name={feat.icon} size={24} />
                </div>
                <h3>{feat.title}</h3>
                <p>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Flows */}
      <section id="flow" style={{ paddingTop: '24px' }}>
        <div className="wrap">
          <div className="eyebrow rv">How it flows</div>
          <h2 className="t rv" style={{ transitionDelay: '.05s' }}>
            From first quote to final payment, in one line.
          </h2>
          <div className="flow" ref={flowRef}>
            <div className="line">
              <i
                style={{
                  transform: `scaleX(${flowProgress.toFixed(3)})`,
                }}
              />
            </div>
            <div className="steps">
              {FLOW_STEPS.map((step, i) => {
                const stepCount = Math.round(flowProgress * 4 + 0.15);
                const isOn = i < stepCount;
                const isCur = i === stepCount - 1 && flowProgress < 0.98;
                return (
                  <div
                    key={step.title}
                    className={`step ${isOn ? 'on' : ''} ${isCur ? 'cur' : ''}`}
                  >
                    <div className="dot">
                      <Icon name={step.icon} size={18} />
                    </div>
                    <h3>{step.title}</h3>
                    <p>{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="start" style={{ paddingTop: '24px' }}>
        <div className="wrap">
          <div className="end rv">
            <h2 className="t">Stop chasing. Start tracking.</h2>
            <p className="sub">Join the early list and be first in when Studio opens.</p>
            <form className="mail" onSubmit={handleJoinSubmit} noValidate>
              <input
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (emailError) setEmailError('');
                }}
                aria-invalid={!!emailError}
              />
              <button type="submit" className="btn pri" style={{ height: '46px' }}>
                Get started
              </button>
            </form>
            <div className="er">{emailError}</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="wrap">
          <span>© {new Date().getFullYear()} DotStudio</span>
          <span>Built for freelancers.</span>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
