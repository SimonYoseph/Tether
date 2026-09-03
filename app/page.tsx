"use client";

import { FormEvent, PointerEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CircleUserRound, LoaderCircle, LogOut, Moon, Plus, Search, Sun, Tag, X } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";

type Note = { id: string; title: string; description: string | null; tags: string[] | null; created_at: string };
type Point = { x: number; y: number };

const supabase = createClient();
const demoNotes: Note[] = [
  { id: "demo-1", title: "A place for the thought before it disappears.", description: null, tags: ["idea"], created_at: "2026-09-03T09:41:00" },
  { id: "demo-2", title: "Try a three-line onboarding checklist.", description: null, tags: ["product"], created_at: "2026-09-03T10:02:00" },
  { id: "demo-3", title: "Read the essay on attention as a design material.", description: null, tags: ["research"], created_at: "2026-09-02T15:22:00" },
  { id: "demo-4", title: "Good things can be simple and still feel considered.", description: null, tags: ["personal"], created_at: "2026-09-02T19:48:00" },
];

const defaultPoints: Point[] = [{ x: 4, y: 5 }, { x: 40, y: 14 }, { x: 18, y: 48 }, { x: 60, y: 54 }];

function noteTitle(body: string, title: string) {
  return title.trim() || body.trim().split("\n")[0].slice(0, 80) || "Untitled note";
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [search, setSearch] = useState("");
  const [positions, setPositions] = useState<Record<string, Point>>(() => {
    if (typeof window === "undefined") return {};
    const saved = window.localStorage.getItem("tether-note-positions");
    return saved ? JSON.parse(saved) : {};
  });
  const [dragging, setDragging] = useState<string | null>(null);
  const [dark, setDark] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("tether-theme") === "dark");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured) { setNotes(demoNotes); setLoading(false); return; }
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

  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; window.localStorage.setItem("tether-theme", dark ? "dark" : "light"); }, [dark]);

  async function loadNotes(userId?: string) {
    if (!userId) return;
    const { data, error } = await supabase.from("tethers").select("id, title, description, tags, created_at").eq("user_id", userId).order("created_at", { ascending: false });
    if (!error) setNotes((data as Note[]) ?? []);
  }

  const visibleNotes = useMemo(() => notes.filter((note) => `${note.title} ${note.description ?? ""} ${(note.tags ?? []).join(" ")}`.toLowerCase().includes(search.toLowerCase())), [notes, search]);

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { const signup = await supabase.auth.signUp({ email, password }); setMessage(signup.error ? signup.error.message : "Check your email to confirm your account."); }
  }

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    if (!user || !isSupabaseConfigured) return setMessage(user ? "Add Supabase credentials first." : "Sign in to save notes.");
    const { error } = await supabase.from("tethers").insert({ user_id: user.id, title: noteTitle(body, title), description: body.trim(), tags: tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean), is_public: false });
    if (error) setMessage(error.message); else { setBody(""); setTitle(""); setTagsInput(""); await loadNotes(user.id); }
  }

  function moveNote(event: PointerEvent<HTMLElement>, id: string) {
    const canvas = event.currentTarget.parentElement;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const point = { x: Math.max(0, Math.min(78, ((event.clientX - bounds.left) / bounds.width) * 100)), y: Math.max(0, Math.min(82, ((event.clientY - bounds.top) / bounds.height) * 100)) };
    const next = { ...positions, [id]: point };
    setPositions(next); window.localStorage.setItem("tether-note-positions", JSON.stringify(next));
  }

  return <main className="app-shell">
    <header className="site-header"><Link className="brand" href="/"><span className="brand-mark">T</span><span>Tether</span></Link><div className="header-actions"><button className="icon-button" onClick={() => setDark(!dark)} title={dark ? "Use light mode" : "Use dark mode"} aria-label={dark ? "Use light mode" : "Use dark mode"}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>{user ? <button className="header-link" onClick={() => void supabase.auth.signOut()}><LogOut size={14} /> Sign out</button> : <a className="header-link" href="#account">Sign in</a>}</div></header>
    <section className="search-header"><div><span className="overline">Your thought space</span><h1>Keep the good stuff.</h1></div><div className="global-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes by keyword or title..." /><kbd>/</kbd></div></section>
    <section className="workspace"><aside className="capture-panel"><div className="section-label"><span>01</span><h2>Quick capture</h2></div><form className="capture-form" onSubmit={saveNote}><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title (optional)" /><textarea autoFocus value={body} onChange={(event) => setBody(event.target.value)} placeholder="Jot it down before it gets away..." rows={6} /><div className="capture-footer"><label className="tag-field"><Tag size={14} /><input value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} placeholder="tags, separated, by commas" /></label><button className="primary-button" disabled={!body.trim()}><Plus size={16} /> Save</button></div></form>{!user && <div className="account-card" id="account"><CircleUserRound size={23} /><h3>Keep it with you.</h3><p>Sign in once to save notes across your devices.</p><form onSubmit={authenticate}><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" /><input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" /><button className="primary-button">Sign in to save</button></form></div>}<div className="capture-note"><span /> Notes are private by default.</div>{message && <p className="message">{message}</p>}</aside><section className="notes-panel"><div className="notes-heading"><div className="section-label"><span>02</span><h2>Notes</h2></div><span className="note-count">{visibleNotes.length} saved</span></div><div className="canvas-intro"><span>Drag notes anywhere</span><span>Newest first</span></div><div className="notes-canvas">{loading ? <div className="empty"><LoaderCircle className="spin" size={20} /> Loading...</div> : visibleNotes.length === 0 ? <div className="empty"><p>No notes found.</p><span>Try another search or capture something new.</span></div> : visibleNotes.map((note, index) => { const point = positions[note.id] ?? defaultPoints[index % defaultPoints.length]; return <article className={`note-card ${dragging === note.id ? "is-dragging" : ""}`} key={note.id} style={{ left: `${point.x}%`, top: `${point.y}%` }} onPointerDown={(event) => { setDragging(note.id); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (dragging === note.id) moveNote(event, note.id); }} onPointerUp={() => setDragging(null)}><div className="note-card-top"><div className="note-tags">{note.tags?.map((tag) => <span key={tag}>#{tag}</span>)}</div><time>{new Date(note.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time></div><p>{note.title}</p><button className="note-close" aria-label="Remove note from view" title="Remove note from view"><X size={14} /></button></article>; })}</div></section></section>
    <footer><span>Ideas have somewhere to land.</span><span>Free to use. Yours to keep.</span></footer>
  </main>;
}
