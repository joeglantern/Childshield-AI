import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { sessionStore } from '../lib/session';
import logo from '../assets/logo.png';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await sessionStore.login(email.trim(), password, totp.trim() || undefined);
      await navigate({ to: '/' });
    } catch {
      setError('Hatukuweza kukuingiza. Angalia taarifa zako.');
    } finally {
      setBusy(false);
    }
  };

  const input =
    'h-[42px] w-full rounded-xl border border-ink/16 bg-white px-3.5 text-[13.5px] outline-none focus:border-teal';

  return (
    <div className="flex min-h-screen items-center justify-center bg-officerbg">
      <form
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-[0_20px_40px_rgba(5,66,64,0.15)]"
      >
        <img src={logo} alt="" className="mx-auto mb-3 h-10 w-10" />
        <h1 className="font-heading mb-4 text-center text-lg font-bold">Ingia kama afisa</h1>
        <div className="flex flex-col gap-2.5">
          <input
            className={input}
            placeholder="Barua pepe"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className={input}
            placeholder="Nenosiri"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className={input}
            placeholder="Namba ya TOTP"
            inputMode="numeric"
            value={totp}
            onChange={(e) => setTotp(e.target.value)}
          />
        </div>
        {error ? <p className="text-critical mt-3 text-[12.5px] font-semibold">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 h-[46px] w-full cursor-pointer rounded-[13px] bg-teal text-[14.5px] font-bold text-white disabled:opacity-60"
        >
          Ingia
        </button>
        <p className="text-muted mt-2.5 text-center text-[11px]">
          Watoto hawaingii hapa. Hii ni kwa maafisa tu.
        </p>
      </form>
    </div>
  );
}
