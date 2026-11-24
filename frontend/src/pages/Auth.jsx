import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Sun, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

function BrandPanel() {
  return (
    <div className="relative hidden flex-col justify-between bg-navy p-10 lg:flex lg:w-[46%]">
      <div>
        <div className="flex items-center gap-2.5">
          <Sun className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold text-white">Solar Advisor</span>
        </div>
        <p className="mt-10 text-xs font-semibold uppercase tracking-widest text-primary">Ask. Plan. Go Solar.</p>
        <h1 className="mt-4 text-4xl font-bold leading-tight text-white">
          Smarter energy.<br />Confident decisions.
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-slate-400">
          Your conversational expert system for solar microgrid and home inverter sizing.
        </p>

        <div className="mt-10 rounded-2xl bg-navy2 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">One connected energy system</p>
          <div className="mt-4 flex items-center gap-2">
            {[
              { label: 'PV ARRAY', value: '6 × 550 W' },
              { label: 'INVERTER', value: '3 kW' },
              { label: 'STORAGE', value: '14.34 kWh' },
            ].map((c, i) => (
              <div key={c.label} className="flex flex-1 items-center gap-2">
                <div className="flex-1 rounded-xl bg-navy px-3 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{c.label}</p>
                  <p className="mt-1 text-base font-bold text-white">{c.value}</p>
                </div>
                {i < 2 && <ArrowRight className="h-4 w-4 shrink-0 text-primary" />}
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-slate-300">Generate → Convert → Store → Power your home</p>
          <p className="mt-1 text-[11px] text-slate-500">Illustrative home configuration · Site verification required</p>
        </div>
      </div>

      <div>
        <p className="text-[15px] font-semibold text-white">Transparent by design</p>
        <p className="mt-1 text-sm text-slate-400">NLP requirement extraction · Rule-based inference<br />Approved knowledge · Explainable recommendations</p>
        <p className="mt-8 text-xs text-slate-500">© 2025 Solar Advisor. Sustainable energy starts with a better plan.</p>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { user, login, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={isAdmin ? '/admin' : '/advisor'} replace />;

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const u = await login(email, password);
      navigate(u.role === 'admin' ? '/admin' : '/advisor');
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen bg-appbg">
      <BrandPanel />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Sun className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold text-navy">Solar Advisor</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Personal energy planning</p>
          <h2 className="mt-2 text-3xl font-bold text-navy">Welcome back</h2>
          <p className="mt-2 text-[15px] text-muted">Sign in to continue your solar plan.</p>

          {error && (
            <div className="mt-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={submit} className="mt-7 space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-navy">Email address</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-line bg-white px-3.5 py-3 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-navy">Password</span>
              <div className="relative">
                <input type={show ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full rounded-lg border border-line bg-white px-3.5 py-3 pr-16 text-sm" />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-primary">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {show ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            <button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primarydark disabled:opacity-50">
              {busy ? 'Signing in…' : <>Sign in <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="mt-6 rounded-xl bg-lightblue p-4 text-[13px] leading-relaxed text-navy">
            <p className="font-semibold">Demo accounts</p>
            <p className="mt-1">General user: <span className="font-mono">user@example.com</span> · <span className="font-mono">User@12345</span></p>
            <p>Administrator: <span className="font-mono">admin@solaradvisor.com</span> · <span className="font-mono">Admin@12345</span></p>
          </div>

          <p className="mt-6 text-sm text-muted">
            New to Solar Advisor? <Link to="/register" className="font-semibold text-primary hover:underline">Create an account</Link>
          </p>
          <p className="mt-10 text-xs text-muted">Your data is private. Your recommendations are explained.</p>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/advisor" replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!agree) { setError('Please agree to the Terms of Service and Privacy Policy.'); return; }
    setBusy(true);
    try {
      await register(name, email, password);
      navigate('/advisor');
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen bg-appbg">
      <BrandPanel />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Sun className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold text-navy">Solar Advisor</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Personal energy planning</p>
          <h2 className="mt-2 text-3xl font-bold text-navy">Create your account</h2>
          <p className="mt-2 text-[15px] text-muted">Start a conversation. Build your solar plan.</p>

          {error && (
            <div className="mt-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={submit} className="mt-7 space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-navy">Full name</span>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan"
                className="w-full rounded-lg border border-line bg-white px-3.5 py-3 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-navy">Email address</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex.morgan@example.com"
                className="w-full rounded-lg border border-line bg-white px-3.5 py-3 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-navy">Password</span>
              <div className="relative">
                <input type={show ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-line bg-white px-3.5 py-3 pr-16 text-sm" />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-primary">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {show ? 'Hide' : 'Show'}
                </button>
              </div>
              <span className="mt-1.5 block text-xs text-muted">Use at least 8 characters, including a number and a symbol.</span>
            </label>
            <label className="flex items-start gap-2.5 text-sm text-muted">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
              I agree to the Terms of Service and Privacy Policy.
            </label>
            <button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primarydark disabled:opacity-50">
              {busy ? 'Creating account…' : <>Create account <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="mt-6 text-sm text-muted">
            Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
          </p>
          <p className="mt-10 text-xs text-muted">Your data is private. Your recommendations are explained.</p>
        </div>
      </div>
    </div>
  );
}
