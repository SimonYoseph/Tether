"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  CircleUserRound,
  Command,
  Link2,
  LoaderCircle,
  LogOut,
  Plus,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";

type Note = {
  id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  created_at: string;
};

const supabase = createClient();
const sampleNotes: Note[] = [
  { id: "sample-1", title: "Competitor raised $4M — double down on retention before they catch up", description: null, tags: ["strategy"], created_at: "2026-09-03T09:41:00" },
  { id: "sample-2", title: "Fix onboarding drop-off at step 3. Permissions screen is confusing.", description: null, tags: ["product"], created_at: "2026-09-03T10:02:00" },
  { id: "sample-3", title: "Rebrand in Q3? Current name tests well with 25-34, poorly with enterprise.", description: null, tags: ["brand"], created_at: "2026-09-02T15:22:00" },
  { id: "sample-4", title: "Shipping cost is killing margin. Explore 3PL or raise AOV threshold to $75.", description: null, tags: ["ops"], created_at: "2026-09-02T19:48:00" },
  { id: "sample-5", title: "Coffee subscription for offices — curated roasters, B2B billing.", description: null, tags: ["idea"], created_at: "2026-09-01T08:30:00" },
];

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [noteTags, setNoteTags] = useState("");
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured) { setNotes(sampleNotes); setLoading(false); return; }
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      await loadNotes(data.user?.id);
      setLoading(false);
    }
    void load();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (isSupabaseConfigured) void loadNotes(session?.user.id);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadNotes(userId?: string) {
    if (!userId) return;
    const { data, error } = await supabase.from("tethers").select("id, title, description, tags, created_at").eq("user_id", userId).order("created_at", { ascending: false });
    if (!error) setNotes((data as Note[]) ?? []);
  }

  const tags = useMemo(() => Array.from(new Set(notes.flatMap((note) => note.tags ?? []))), [notes]);
  const filteredNotes = useMemo(() => notes.filter((note) => {
    const matchesSearch = `${note.title} ${note.description ?? ""} ${(note.tags ?? []).join(" ")}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (activeTag === "all" || note.tags?.includes(activeTag));
  }), [activeTag, notes, search]);

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true); setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const signup = await supabase.auth.signUp({ email, password });
      setMessage(signup.error ? signup.error.message : "Check your email to confirm your account.");
    }
    setSubmitting(false);
  }

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteText.trim()) return;
    if (!isSupabaseConfigured || !user) return setMessage(user ? "Add Supabase credentials to .env.local first." : "Sign in to save notes.");
    setSubmitting(true); setMessage("");
    const { error } = await supabase.from("tethers").insert({ user_id: user.id, title: noteText.trim(), tags: noteTags.split(",").map((tag) => tag.trim()).filter(Boolean), is_public: false });
    if (error) setMessage(error.message);
    else { setNoteText(""); setNoteTags(""); await loadNotes(user.id); }
    setSubmitting(false);
  }

  return (
    <main className="app-shell">
      <header className="nav"><Link className="brand" href="/"><span className="brand-mark"><Link2 size={17} /></span><span>Tether</span></Link><div className="nav-actions"><span className="sync-status"><span /> Always ready</span>{user ? <button className="nav-button" onClick={() => void supabase.auth.signOut()}><LogOut size={15} /> Sign out</button> : <a className="nav-button" href="#account">Sign in <ArrowUpRight size={15} /></a>}</div></header>
      <section className="intro"><div className="intro-copy"><div className="eyebrow"><Sparkles size={13} /> Your second brain, without the ceremony</div><h1>Save it before<br /><em>it gets away.</em></h1><p>One quiet place for the ideas, links, observations, and reminders your mind keeps generating.</p></div><div className="intro-aside"><span className="aside-rule" /><p>For minds that run fast.<br />Capture now. Find later.</p></div></section>
      <section className="capture-layout">
        <div className="capture-column"><div className="section-kicker"><span>01</span><h2>Capture</h2></div>{user ? <form className="capture-box" onSubmit={saveNote}><textarea autoFocus value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="What are you thinking about?" rows={5} /><div className="capture-tools"><label className="tag-input"><Tag size={15} /><input value={noteTags} onChange={(event) => setNoteTags(event.target.value)} placeholder="Add tags" /></label><button className="save-button" disabled={submitting || !noteText.trim()}>{submitting ? <LoaderCircle className="spin" size={16} /> : <><Plus size={16} /> Save note</>}</button></div></form> : <div className="account-box" id="account"><div className="account-icon"><CircleUserRound size={20} /></div><h3>Make it yours.</h3><p>Sign in once and your notes follow you everywhere.</p><form className="account-form" onSubmit={authenticate}><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" /><input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" /><button className="save-button" disabled={submitting}>{submitting ? "Connecting..." : "Start saving"} <ArrowUpRight size={15} /></button></form></div>}{message && <p className="message">{message}</p>}<div className="capture-hint"><Command size={13} /> <span>Capture in seconds. Organize when you feel like it.</span></div></div>
        <div className="feed-column"><div className="section-head"><div className="section-kicker"><span>02</span><h2>Your stream</h2></div><span className="note-count">{filteredNotes.length} saved</span></div><div className="search-row"><div className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your notes..." /><kbd>/</kbd></div><button className="filter-button"><ChevronDown size={15} /> Recent</button></div><div className="tag-row"><button className={activeTag === "all" ? "tag active" : "tag"} onClick={() => setActiveTag("all")}>All notes</button>{tags.map((tag) => <button className={activeTag === tag ? "tag active" : "tag"} key={tag} onClick={() => setActiveTag(tag)}>#{tag}</button>)}</div><div className="note-list">{loading ? <div className="empty"><LoaderCircle className="spin" size={20} /> Loading notes...</div> : filteredNotes.length === 0 ? <div className="empty"><Bookmark size={22} /><p>Nothing here yet.</p><span>Start with the thought you do not want to lose.</span></div> : filteredNotes.map((note) => <article className="note" key={note.id}><div className="note-top"><div className="note-tags">{note.tags?.map((tag) => <span key={tag}>#{tag}</span>)}</div><time>{formatDate(note.created_at)}</time></div><p>{note.title}</p>{note.description && <small>{note.description}</small>}<button className="note-action" aria-label="Open note" title="Open note"><ArrowUpRight size={15} /></button></article>)}</div></div>
      </section>
      <section className="audience-strip"><div><strong>One place for<br /><em>everything in your head.</em></strong></div><div className="audience-list"><span>Ideas</span><span>Research</span><span>Links</span><span>Work notes</span><span>Life admin</span></div></section>
      <footer><span>Built for thoughts with somewhere to go.</span><span><Check size={13} /> Private by default</span><span>© 2026 Tether</span></footer>
    </main>
  );
}
