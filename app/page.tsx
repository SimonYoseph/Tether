"use client";

import {
  FormEvent,
  PointerEvent,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Check,
  CircleUserRound,
  Edit3,
  Link2,
  LoaderCircle,
  LogOut,
  Plus,
  Search,
  Settings2,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";

type Note = {
  id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at?: string | null;
};
type Point = { x: number; y: number };
type Theme = "light" | "charcoal" | "black";
const fontOptions = {
  courier: '"Courier New", Courier, monospace',
  rounded: '"Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif',
  humanist: "Verdana, Geneva, sans-serif",
  editorial: 'Georgia, "Times New Roman", serif',
  geometric: 'Futura, "Century Gothic", Arial, sans-serif',
} as const;
const supabase = createClient();
const demoNotes: Note[] = [
  {
    id: "demo-1",
    title: "A place for the thought before it disappears.",
    description: null,
    tags: ["idea"],
    created_at: "2026-09-03T09:41:00",
  },
  {
    id: "demo-2",
    title: "Try a three-line onboarding checklist.",
    description: null,
    tags: ["product"],
    created_at: "2026-09-03T10:02:00",
  },
  {
    id: "demo-3",
    title: "Read the essay on attention as a design material.",
    description: null,
    tags: ["research"],
    created_at: "2026-09-02T15:22:00",
  },
];
const defaultPoints: Point[] = [
  { x: 4, y: 5 },
  { x: 40, y: 14 },
  { x: 18, y: 48 },
  { x: 60, y: 54 },
];
function noteTitle(body: string, title: string) {
  return (
    title.trim() || body.trim().split("\n")[0].slice(0, 80) || "Untitled note"
  );
}
function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
function renderNoteContent(text: string): ReactNode[] {
  const lines = text.split("\n");
  const content: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const unordered = lines[index].match(/^\s*[-*•]\s+(.+)$/);
    const ordered = lines[index].match(/^\s*(\d+)[.)]\s+(.+)$/);
    if (unordered) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*[-*•]\s+(.+)$/);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      content.push(
        <ul key={`ul-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{item}</li>
          ))}
        </ul>,
      );
    } else if (ordered) {
      const items: string[] = [];
      const start = Number(ordered[1]);
      while (index < lines.length) {
        const item = lines[index].match(/^\s*\d+[.)]\s+(.+)$/);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      content.push(
        <ol key={`ol-${index}`} start={start}>
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{item}</li>
          ))}
        </ol>,
      );
    } else {
      if (lines[index].trim())
        content.push(<p key={`p-${index}`}>{lines[index]}</p>);
      index += 1;
    }
  }
  return content;
}

export default function Home() {
  useEffect(() => {
    function closeProfile(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".header-actions"))
        setProfileOpen(false);
    }
    document.addEventListener("mousedown", closeProfile);
    return () => document.removeEventListener("mousedown", closeProfile);
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [search, setSearch] = useState("");
  const [positions, setPositions] = useState<Record<string, Point>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("black");
  const [addOpen, setAddOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [structured, setStructured] = useState(false);
  const [sortOldest, setSortOldest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [fontChoice, setFontChoice] =
    useState<keyof typeof fontOptions>("courier");
  const noteBodyRef = useRef<HTMLTextAreaElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const dragStartPoint = useRef<Point | null>(null);
  const trashRef = useRef<HTMLButtonElement>(null);
  const [trashHover, setTrashHover] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTags, setEditTags] = useState("");
  useEffect(() => {
    async function load() {
      const savedTheme = window.localStorage.getItem(
        "tether-theme",
      ) as Theme | null;
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.dataset.theme = savedTheme;
      }
      setStructured(window.localStorage.getItem("tether-structured-view") === "true");
      if (!isSupabaseConfigured) {
        setNotes(demoNotes);
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      await loadNotes(data.user?.id);
      setLoading(false);
    }
    void load();
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (isSupabaseConfigured) void loadNotes(session?.user.id);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => { function closeView(event: MouseEvent) { const target = event.target; if (!(target instanceof Element) || !target.closest(".view-options-wrap")) setViewOpen(false); } document.addEventListener("mousedown", closeView); return () => document.removeEventListener("mousedown", closeView); }, []);
  async function loadNotes(userId?: string) {
    if (!userId) return;
    const { data, error } = await supabase
      .from("tethers")
      .select("id, title, description, tags, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: sortOldest });
    if (!error) setNotes((data as Note[]) ?? []);
  }
  const visibleNotes = useMemo(() => {
    const filtered = notes.filter((note) =>
      `${note.title} ${note.description ?? ""} ${(note.tags ?? []).join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
    return sortOldest ? [...filtered].reverse() : filtered;
  }, [notes, search, sortOldest]);
  const allTags = useMemo(
    () => Array.from(new Set(notes.flatMap((note) => note.tags ?? []))),
    [notes],
  );
  function chooseTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("tether-theme", nextTheme);
  }
  function toggleStructured() {
    setStructured((current) => {
      const next = !current;
      window.localStorage.setItem("tether-structured-view", String(next));
      return next;
    });
  }
  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      const signup = await supabase.auth.signUp({ email, password });
      setMessage(
        signup.error
          ? signup.error.message
          : "Check your email to confirm your account.",
      );
    }
  }
  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    if (!user || !isSupabaseConfigured)
      return setMessage(
        user ? "Add Supabase credentials first." : "Sign in to save notes.",
      );
    const { error } = await supabase.from("tethers").insert({
      user_id: user.id,
      title: noteTitle(body, title),
      description: body.trim(),
      tags: tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      is_public: false,
      updated_at: new Date().toISOString(),
    });
    if (error) setMessage(error.message);
    else {
      setBody("");
      setTitle("");
      setTagsInput("");
      setAddOpen(false);
      await loadNotes(user.id);
    }
  }
  function beginEdit(note: Note) {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditBody(note.description ?? note.title);
    setEditTags(note.tags?.join(", ") ?? "");
  }
  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId || !editBody.trim() || !user || !isSupabaseConfigured) return;
    const { error } = await supabase.from("tethers").update({ title: noteTitle(editBody, editTitle), description: editBody.trim(), tags: editTags.split(",").map((tag) => tag.trim()).filter(Boolean) }).eq("id", editingId).eq("user_id", user.id);
    if (error) setMessage(error.message); else { setEditingId(null); await loadNotes(user.id); }
  }
  function moveNote(event: PointerEvent<HTMLElement>, id: string) {
    if (dragRef.current?.id !== id) return;
    const canvas = event.currentTarget.parentElement;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const noteBounds = event.currentTarget.getBoundingClientRect();
    const horizontalPadding = (noteBounds.width / bounds.width) * 100;
    const point = {
      x: Math.max(
        0,
        Math.min(100 - horizontalPadding, ((event.clientX - bounds.left - dragRef.current.offsetX) / bounds.width) * 100),
      ),
      y: Math.max(
        -20,
        Math.min(82, ((event.clientY - bounds.top - dragRef.current.offsetY) / bounds.height) * 100),
      ),
    };
    const trashBounds = trashRef.current?.getBoundingClientRect();
    const overlapsTrash = Boolean(trashBounds && noteBounds.right >= trashBounds.left && noteBounds.left <= trashBounds.right && noteBounds.bottom >= trashBounds.top && noteBounds.top <= trashBounds.bottom);
    setTrashHover(overlapsTrash);
    const next = { ...positions, [id]: point };
    setPositions(next);
    window.localStorage.setItem("tether-note-positions", JSON.stringify(next));
  }
  async function dropNote(event: PointerEvent<HTMLElement>, id: string) {
    const trashBounds = trashRef.current?.getBoundingClientRect();
    const noteBounds = event.currentTarget.getBoundingClientRect();
    setDragging(null);
    dragRef.current = null;
    setTrashHover(false);
    if (!trashBounds || noteBounds.right < trashBounds.left || noteBounds.left > trashBounds.right || noteBounds.bottom < trashBounds.top || noteBounds.top > trashBounds.bottom) {
      dragStartPoint.current = null;
      return;
    }
    setConfirmDeleteId(id);
    return;
  }
  async function confirmDelete() {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    if (isSupabaseConfigured && user) {
      const { error } = await supabase.from("tethers").delete().eq("id", id).eq("user_id", user.id);
      if (error) return setMessage(error.message);
    }
    setNotes((current) => current.filter((note) => note.id !== id));
    setConfirmDeleteId(null);
    dragStartPoint.current = null;
  }
  function cancelDelete() {
    if (confirmDeleteId && dragStartPoint.current) setPositions((current) => ({ ...current, [confirmDeleteId]: dragStartPoint.current as Point }));
    setConfirmDeleteId(null);
    dragStartPoint.current = null;
  }
  function startDragging(event: PointerEvent<HTMLElement>, id: string) {
    const canvas = event.currentTarget.parentElement;
    if (!canvas) return;
    const noteBounds = event.currentTarget.getBoundingClientRect();
    const bounds = canvas.getBoundingClientRect();
    dragStartPoint.current = positions[id] ?? { x: ((noteBounds.left - bounds.left) / bounds.width) * 100, y: ((noteBounds.top - bounds.top) / bounds.height) * 100 };
    dragRef.current = { id, offsetX: event.clientX - noteBounds.left, offsetY: event.clientY - noteBounds.top };
    setDragging(id);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function insertList(marker: "- " | "1. ") {
    const textarea = noteBodyRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const needsNewLine = start > 0 && body[start - 1] !== "\n";
    const insertion = `${needsNewLine ? "\n" : ""}${marker}`;
    const nextValue = `${body.slice(0, start)}${insertion}${body.slice(end)}`;
    setBody(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insertion.length, start + insertion.length);
    });
  }
  return (
    <main
      className={`app-shell ${compact ? "compact-view" : ""} ${structured ? "structured-view" : ""}`}
      style={{ "--ui-font": fontOptions[fontChoice] } as CSSProperties}
    >
      <div className="dashboard">
        <header className="site-header">
          <Link className="brand" href="/">
            <Image
              className="brand-logo"
              src="/tether.jpg"
              alt="Tether logo"
              width={60}
              height={60}
              priority
            />
            <span className="brand-wordmark">TETHER</span>
          </Link>
          <div className="header-actions">
            <button
              className="profile-button"
              onClick={() => setProfileOpen(!profileOpen)}
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
            >
              <CircleUserRound size={19} />
            </button>
            <div
              className={`profile-menu ${profileOpen ? "is-open" : ""}`}
              aria-hidden={!profileOpen}
            >
              <div className="profile-heading">
                <CircleUserRound size={20} />
                <div>
                  <strong>{user ? "Your account" : "Guest"}</strong>
                  <small>
                    {user ? "Personal workspace" : "Sign in to save"}
                  </small>
                </div>
              </div>
              <div className="theme-options">
                <span>Theme</span>
                <div>
                  <button className={theme === "light" ? "selected" : ""} onClick={() => chooseTheme("light")}>Light</button>
                  <button className={theme === "charcoal" ? "selected" : ""} onClick={() => chooseTheme("charcoal")}>Charcoal</button>
                  <button className={theme === "black" ? "selected" : ""} onClick={() => chooseTheme("black")}>Black</button>
                </div>
              </div>
              <button
                className="menu-signout"
                onClick={() => {
                  setProfileOpen(false);
                  void supabase.auth.signOut();
                }}
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </div>
        </header>
        <section className="search-header">
          <div className="subheader-line">
            <span>Your Thought Space</span>
            <b>|</b>
            <strong>Keep the Good Stuff</strong>
          </div>
          <div className="search-tools">
            <div className="global-search">
              <Search size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by text or date..."
              />
            </div>
            <button
              className="add-note-button"
              onClick={() => setAddOpen(!addOpen)}
              aria-label="Add a note"
              title="Add a note"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="tag-tools">
            <button>
              <Tag size={15} /> Add Tag
            </button>
            <button>
              <Edit3 size={15} /> Edit Tags
            </button>
            <label className="font-picker">
              Font
              <select
                value={fontChoice}
                onChange={(event) =>
                  setFontChoice(event.target.value as keyof typeof fontOptions)
                }
                aria-label="Choose interface font"
              >
                <option value="rounded">Rounded</option>
                <option value="humanist">Humanist</option>
                <option value="editorial">Editorial</option>
                <option value="mono">Mono</option>
                <option value="geometric">Geometric</option>
              </select>
            </label>
            {allTags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        </section>
        <div className="connection-strip">
          <span className="connection-icon">
            <Link2 size={16} />
          </span>
          <div>
            <strong>Keep your thoughts close</strong>
            <small>Capture ideas, notes, and links in one quiet place.</small>
          </div>
          <span className="connected-state">Connected</span>
        </div>
        <section
          className={`add-note-panel ${addOpen ? "is-open" : ""} ${body.trim().length > 80 ? "has-content" : ""}`}
          aria-hidden={!addOpen}
        >
          <div className="add-note-heading">
            <span className="section-label-text">NEW NOTE</span>
          </div>
          {user ? (
            <form className="capture-form" onSubmit={saveNote}>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Title (optional)"
              />
              <textarea
                autoFocus
                ref={noteBodyRef}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Jot it down before it gets away..."
                rows={5}
              />
              <div className="list-tools" aria-label="Insert list">
                <button type="button" onClick={() => insertList("- ")} aria-label="Insert bullet list" title="Insert bullet list">•</button>
                <button type="button" onClick={() => insertList("1. ")} aria-label="Insert numbered list" title="Insert numbered list">1.</button>
              </div>
              <div className="capture-footer">
                <label className="tag-field">
                  <Tag size={14} />
                  <input
                    value={tagsInput}
                    onChange={(event) => setTagsInput(event.target.value)}
                    placeholder="tags, separated, by commas"
                  />
                </label>
                <div className="note-actions">
                  <button
                    type="button"
                    className="close-button"
                    onClick={() => setAddOpen(false)}
                    aria-label="Close add note panel"
                  >
                    <X size={18} />
                  </button>
                  <button className="primary-button" disabled={!body.trim()}>
                    <Plus size={16} /> Save note
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="account-card" id="account">
              <CircleUserRound size={23} />
              <h3>Keep it with you.</h3>
              <p>Sign in once to save notes across your devices.</p>
              <form onSubmit={authenticate}>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                />
                <input
                  required
                  minLength={6}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                />
                <button className="primary-button">Sign in to save</button>
              </form>
            </div>
          )}
          {message && <p className="message">{message}</p>}
        </section>
        <section className="notes-panel">
          <div className="notes-heading">
            <div className="section-label">
              <span>01</span>
              <h2>Notes</h2>
            </div>
            <div className="note-heading-actions">
              <button ref={trashRef} className={`trash-button ${trashHover ? "is-hovered" : ""}`} aria-label="Delete note" title="Drag a note here to delete it"><Trash2 size={17} /></button>
              <div className="view-options-wrap">
              <button className="view-options-button" onClick={() => setViewOpen(!viewOpen)} aria-label="Open view options" aria-expanded={viewOpen} title="View options"><Settings2 size={17} /></button>
              <div className={`profile-menu view-menu ${viewOpen ? "is-open" : ""}`} aria-hidden={!viewOpen}>
                <div className="menu-title">View Options</div>
                <div className="menu-divider" />
                <label className="menu-toggle"><span>Compact view</span><input type="checkbox" checked={compact} onChange={(event) => setCompact(event.target.checked)} /><i /></label>
                <label className="menu-toggle"><span>Structured view</span><input type="checkbox" checked={structured} onChange={toggleStructured} /><i /></label>
                <button className="menu-row" onClick={() => setSortOldest(!sortOldest)}><span>Sort: {sortOldest ? "oldest first" : "newest first"}</span><Check size={15} className={sortOldest ? "visible" : "hidden"} /></button>
              </div>
            </div>
            </div>
          </div>
          <div className="canvas-intro">
            <span>Drag notes anywhere <i className="hint-divider" /> <b className="note-count">{visibleNotes.length} saved</b></span>
            <span>{sortOldest ? "Oldest first" : "Newest first"}</span>
          </div>
          <div className="notes-canvas">
            {loading ? (
              <div className="empty">
                <LoaderCircle className="spin" size={20} /> Loading...
              </div>
            ) : visibleNotes.length === 0 ? (
              <div className="empty">
                <p>No notes found.</p>
                <span>Try another search or capture something new.</span>
              </div>
            ) : (
              visibleNotes.map((note, index) => {
                const point =
                  positions[note.id] ??
                  defaultPoints[index % defaultPoints.length];
                return (
                  <article
                    className={`note-card ${dragging === note.id ? "is-dragging" : ""} ${dragging === note.id && trashHover ? "is-trash-hover" : ""}`}
                    key={note.id}
                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                    onPointerDown={(event) => startDragging(event, note.id)}
                    onPointerMove={(event) => {
                      moveNote(event, note.id);
                    }}
                    onPointerUp={(event) => void dropNote(event, note.id)}
                    onDoubleClick={() => beginEdit(note)}
                  >
                    <div className="note-card-top">
                      <div className="note-tags">
                        {note.tags?.map((tag) => (
                          <span key={tag}>#{tag}</span>
                        ))}
                      </div>
                      <div className="note-times">
                        <span>Created {formatDateTime(note.created_at)}</span>
                        <span>
                          Edited{" "}
                          {formatDateTime(note.updated_at ?? note.created_at)}
                        </span>
                      </div>
                    </div>
                    {editingId === note.id ? <form className="note-edit-form" onSubmit={saveEdit} onPointerDown={(event) => event.stopPropagation()}><input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} placeholder="Title (optional)" /><textarea autoFocus value={editBody} onChange={(event) => setEditBody(event.target.value)} rows={5} /><input value={editTags} onChange={(event) => setEditTags(event.target.value)} placeholder="Tags" /><div className="note-edit-actions"><button type="button" className="cancel-button" onClick={() => setEditingId(null)}>Cancel</button><button className="primary-button" disabled={!editBody.trim()}>Save changes</button></div></form> : <>{note.description && note.description !== note.title && <h3>{note.title}</h3>}{renderNoteContent(note.description ?? note.title)}</>}
                  </article>
                );
              })
            )}
          </div>
        </section>
        {confirmDeleteId && <div className="confirm-backdrop" role="presentation" onMouseDown={cancelDelete}><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="trash-title" onMouseDown={(event) => event.stopPropagation()}><span className="confirm-icon"><Trash2 size={20} /></span><h2 id="trash-title">Move this note to Trash?</h2><p>This note will be removed from your workspace.</p><div className="confirm-actions"><button className="cancel-button" onClick={cancelDelete}>Cancel</button><button className="delete-button" onClick={() => void confirmDelete()}>Move to Trash</button></div></div></div>}
        <footer>
          <span>Ideas have somewhere to land.</span>
          <span>Free to use. Yours to keep.</span>
        </footer>
      </div>
    </main>
  );
}
