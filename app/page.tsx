"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, Link2, LoaderCircle, LogOut, Plus, Sparkles } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";

type Tether = {
  id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  tether_pulls: [{ count: number }] | null;
};

const supabase = createClient();

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [tethers, setTethers] = useState<Tether[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      await loadTethers();
      setLoading(false);
    }
    void load();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void loadTethers();
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadTethers() {
    const { data, error } = await supabase.from("tethers").select("id, title, description, tags, tether_pulls(count)").eq("is_public", true).order("created_at", { ascending: false });
    if (!error) setTethers((data as Tether[]) ?? []);
  }

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSupabaseConfigured) return setMessage("Add Supabase credentials to .env.local first.");
    setSubmitting(true); setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const signup = await supabase.auth.signUp({ email, password });
      setMessage(signup.error ? signup.error.message : "Check your email to confirm your account.");
    }
    setSubmitting(false);
  }

  async function createTether(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSupabaseConfigured) return setMessage("Add Supabase credentials to .env.local first.");
    setSubmitting(true); setMessage("");
    const { error } = await supabase.from("tethers").insert({ user_id: user?.id, title: title.trim(), description: description.trim() || null, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean) });
    if (error) setMessage(error.message);
    else { setTitle(""); setDescription(""); setTags(""); await loadTethers(); }
    setSubmitting(false);
  }

  async function pullTether(tetherId: string) {
    if (!isSupabaseConfigured) return setMessage("Add Supabase credentials to .env.local first.");
    if (!user) return setMessage("Sign in to pull a tether.");
    const { error } = await supabase.from("tether_pulls").insert({ tether_id: tetherId, pulled_by: user.id });
    setMessage(error ? (error.code === "23505" ? "You already pulled this tether." : error.message) : "Tether pulled.");
    if (!error) await loadTethers();
  }

  return (
    <main className="shell">
      <header className="topbar"><Link className="brand" href="/" aria-label="Tether home"><span className="brand-mark"><Link2 size={18} /></span>TETHER</Link>{user ? <button className="button button-quiet" onClick={() => void supabase.auth.signOut()}><LogOut size={16} /> Sign out</button> : <span className="status-dot">Open network</span>}</header>
      <section className="hero"><div className="eyebrow"><Sparkles size={14} /> Ideas worth carrying</div><h1>Find the thread.<br /><em>Pull it forward.</em></h1><p>A living collection of thoughts, references, and sparks shared by people building what comes next.</p></section>
      <section className="workspace">
        <aside className="composer panel"><div className="panel-heading"><span className="number">01</span><div><h2>Make a tether</h2><p>Leave something useful behind.</p></div></div>
          {user ? <form onSubmit={createTether} className="stack"><label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A thought to hold onto" /></label><label>Context<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What makes this worth sharing?" rows={4} /></label><label>Tags<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="design, systems, culture" /></label><button className="button button-primary" disabled={submitting}><Plus size={17} /> {submitting ? "Saving..." : "Publish tether"}</button></form> : <form onSubmit={authenticate} className="stack"><p className="form-intro">Sign in to publish and pull ideas. New accounts are created automatically.</p><label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label>Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label><button className="button button-primary" disabled={submitting}>{submitting ? "Connecting..." : "Continue"}</button></form>}
          {message && <p className="message" role="status">{message}</p>}
        </aside>
        <section className="feed"><div className="feed-heading"><div><span className="number">02</span><h2>The current</h2></div><span className="count">{tethers.length} tethers</span></div>
          {loading ? <div className="empty"><LoaderCircle className="spin" size={22} /> Loading the network...</div> : tethers.length === 0 ? <div className="empty"><p>No tethers yet.</p><span>Be the first person to leave a thread.</span></div> : <div className="tether-list">{tethers.map((tether, index) => <article className="tether" key={tether.id}><div className="tether-index">{String(index + 1).padStart(2, "0")}</div><div className="tether-body"><h3>{tether.title}</h3>{tether.description && <p>{tether.description}</p>}<div className="meta">{tether.tags?.map((tag) => <span key={tag}>#{tag}</span>)}<span>{tether.tether_pulls?.[0]?.count ?? 0} pulls</span></div></div><button className="pull-button" onClick={() => void pullTether(tether.id)} aria-label={`Pull ${tether.title}`} title="Pull tether"><ArrowDownToLine size={19} /></button></article>)}</div>}
        </section>
      </section>
      <footer><span>Built for ideas with somewhere to go.</span><span>© 2026 Tether</span></footer>
    </main>
  );
}
