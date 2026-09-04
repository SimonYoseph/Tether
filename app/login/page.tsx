"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { GeistSans } from "geist/font/sans";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase";

const supabase = createClient();

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    else router.replace("/");
    setLoading(false);
  }

  async function signUp() {
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) setMessage(error.message);
    else if (data.session) router.replace("/");
    else setMessage("Check your email to confirm your account, then sign in.");
    setLoading(false);
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-label="Sign in to Tether">
        <div className="login-brand">
          <Image className="brand-logo" src="/tether.jpg" alt="Tether logo" width={60} height={60} priority />
          <span className={`${GeistSans.className} brand-wordmark`}>TETHER</span>
        </div>
        <div className="login-intro">
          <strong>Keep your thoughts close</strong>
          <p>Capture ideas, notes, and links in one quiet place.</p>
        </div>
        <form onSubmit={signIn} className="login-form">
          <label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
          <label>Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
          <button className="login-submit" disabled={loading}>{loading ? "Please wait..." : <>Sign in <ArrowRight size={16} /></>}</button>
          <button type="button" className="login-signup" onClick={() => void signUp()} disabled={loading}>Create account</button>
          {message && <p className="login-message" role="alert">{message}</p>}
        </form>
      </section>
    </main>
  );
}