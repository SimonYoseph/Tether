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
import { useRouter } from "next/navigation";
import { GeistSans } from "geist/font/sans";
import {
  Check,
  CircleUserRound,
  Edit3,
  Hash,
  Link2,
  LoaderCircle,
  LogOut,
  Palette,
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
  outline_color?: string | null;
  created_at: string;
  updated_at?: string | null;
};
type Point = { x: number; y: number };
type NoteSize = { width: number; height: number };
type Theme = "light" | "charcoal" | "black";
type TagKeywords = Record<string, string[]>;
const tagColorPresets = ["#48aff5", "#ff927b", "#f5c85b", "#73d39a", "#b698ff"];
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
function initialNotePoint(index: number, total: number): Point {
  return { x: 4, y: 4 + (index * 92) / Math.max(total, 1) };
}
function notePositionsKey(userId?: string) {
  return `tether-note-positions-${userId ?? "guest"}`;
}
function noteSizesKey(userId?: string) {
  return `tether-note-sizes-${userId ?? "guest"}`;
}
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
function tagChipStyle(color?: string): CSSProperties {
  if (!color) return { borderColor: "#294761" };
  const hex = color.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return {
    borderColor: color,
    color: luminance < 0.42 ? "#f5f9fc" : color,
    backgroundColor: `color-mix(in srgb, ${color} 18%, #172a3d)`,
  };
}
function tagsFromBody(text: string) {
  return Array.from(text.matchAll(/(^|\s)(#{1,2})([\p{L}\p{N}_-]+)/gu), (match) =>
    `${match[2] === "##" ? "sub" : "main"}:${match[3].replace(/\s+/g, "-")}`,
  );
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
  const router = useRouter();
  useEffect(() => {
    function closeProfile(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".header-actions"))
        setProfileOpen(false);
    }
    document.addEventListener("mousedown", closeProfile);
    return () => document.removeEventListener("mousedown", closeProfile);
  }, []);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [tagType, setTagType] = useState<"main" | "sub">("main");
  const [newTag, setNewTag] = useState("");
  const [newTagKeywords, setNewTagKeywords] = useState("");
  const [newTagColor, setNewTagColor] = useState(tagColorPresets[0]);
  const [newTagColorHex, setNewTagColorHex] = useState(tagColorPresets[0]);
  const [customColorOpen, setCustomColorOpen] = useState(false);
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tagEditValue, setTagEditValue] = useState("");
  const [tagEditType, setTagEditType] = useState<"main" | "sub">("main");
  const [tagEditColor, setTagEditColor] = useState(tagColorPresets[0]);
  const [tagEditColorHex, setTagEditColorHex] = useState(tagColorPresets[0]);
  const [tagEditKeywords, setTagEditKeywords] = useState("");
  const [editCustomColorOpen, setEditCustomColorOpen] = useState(false);
  const [tagColors, setTagColors] = useState<Record<string, string>>({});
  const [tagKeywords, setTagKeywords] = useState<TagKeywords>({});
  const [search, setSearch] = useState("");
  const [positions, setPositions] = useState<Record<string, Point>>({});
  const [noteSizes, setNoteSizes] = useState<Record<string, NoteSize>>({});
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
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number; point: Point } | null>(null);
  const dragStartPoint = useRef<Point | null>(null);
  const resizeRef = useRef<{ id: string; edge: string; startX: number; startY: number; startWidth: number; startHeight: number; minWidth: number; minHeight: number; startPoint: Point; element: HTMLElement } | null>(null);
  const trashRef = useRef<HTMLButtonElement>(null);
  const trashHoverRef = useRef(false);
  const [trashHover, setTrashHover] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTags, setEditTags] = useState("");
  const editOriginalRef = useRef({ title: "", body: "", tags: "" });
  const [confirmEditExit, setConfirmEditExit] = useState(false);
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
      const savedTagColors = window.localStorage.getItem("tether-tag-colors");
      if (savedTagColors) setTagColors(JSON.parse(savedTagColors));
      const savedTagKeywords = window.localStorage.getItem("tether-tag-keywords");
      if (savedTagKeywords) setTagKeywords(JSON.parse(savedTagKeywords));
      if (!isSupabaseConfigured) {
        setNotes(demoNotes);
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      if (data.user) {
        const savedPositions = window.localStorage.getItem(notePositionsKey(data.user.id)) ?? window.localStorage.getItem("tether-note-positions");
        if (savedPositions) setPositions(JSON.parse(savedPositions));
        const savedSizes = window.localStorage.getItem(noteSizesKey(data.user.id));
        if (savedSizes) setNoteSizes(JSON.parse(savedSizes));
        const { data: tagSettings } = await supabase
          .from("tether_tag_settings")
          .select("tag, color")
          .eq("user_id", data.user.id);
        if (tagSettings?.length) setTagColors((current) => ({ ...current, ...Object.fromEntries(tagSettings.map((setting) => [setting.tag, setting.color])) }));
      }
      await loadNotes(data.user?.id);
      setLoading(false);
    }
    void load();
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        const savedPositions = window.localStorage.getItem(notePositionsKey(session?.user.id)) ?? window.localStorage.getItem("tether-note-positions");
        setPositions(savedPositions ? JSON.parse(savedPositions) : {});
        const savedSizes = window.localStorage.getItem(noteSizesKey(session?.user.id));
        setNoteSizes(savedSizes ? JSON.parse(savedSizes) : {});
        if (isSupabaseConfigured) void loadNotes(session?.user.id);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!editingId || confirmEditExit) return;
    function closeEdit(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest(`[data-note-id="${editingId}"]`)) return;
      const changed = editOriginalRef.current.title !== editTitle || editOriginalRef.current.body !== editBody || editOriginalRef.current.tags !== editTags;
      if (changed) setConfirmEditExit(true);
      else setEditingId(null);
    }
    document.addEventListener("mousedown", closeEdit);
    return () => document.removeEventListener("mousedown", closeEdit);
  }, [confirmEditExit, editBody, editTags, editTitle, editingId]);
  useEffect(() => { function closeView(event: MouseEvent) { const target = event.target; if (!(target instanceof Element) || !target.closest(".view-options-wrap")) setViewOpen(false); } document.addEventListener("mousedown", closeView); return () => document.removeEventListener("mousedown", closeView); }, []);
  useEffect(() => {
    function closeTagPicker(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element) || target.closest(".tag-picker-menu, .tag-editor-menu, .tag-picker-trigger, .tag-editor-trigger")) return;
      setTagPickerOpen(false);
      setCustomColorOpen(false);
      setTagEditorOpen(false);
    }
    document.addEventListener("mousedown", closeTagPicker);
    return () => document.removeEventListener("mousedown", closeTagPicker);
  }, []);
  useEffect(() => {
    if (structured || !notes.length) return;
    const timer = window.setTimeout(() => {
      const canvas = document.querySelector<HTMLElement>(".notes-canvas");
      if (!canvas) return;
      const canvasBounds = canvas.getBoundingClientRect();
      const nextPositions = { ...positions };
      const placed: DOMRect[] = [];
      let changed = false;
      Array.from(canvas.querySelectorAll<HTMLElement>("[data-note-id]")).forEach((card) => {
        const bounds = card.getBoundingClientRect();
        const overlaps = placed.some((other) => bounds.left < other.right && bounds.right > other.left && bounds.top < other.bottom && bounds.bottom > other.top);
        if (!overlaps) {
          placed.push(bounds);
          return;
        }
        const top = Math.max(...placed.map((other) => other.bottom)) + 20;
        const point = { x: ((bounds.left - canvasBounds.left) / canvasBounds.width) * 100, y: ((top - canvasBounds.top) / canvasBounds.height) * 100 };
        nextPositions[card.dataset.noteId!] = point;
        placed.push({ left: bounds.left, top, right: bounds.right, bottom: top + bounds.height } as DOMRect);
        changed = true;
      });
      if (changed) {
        setPositions(nextPositions);
        window.localStorage.setItem(notePositionsKey(user?.id), JSON.stringify(nextPositions));
      }
    }, 150);
    return () => window.clearTimeout(timer);
  }, [notes, positions, structured, user?.id]);
  useEffect(() => {
    if (!notes.length) return;
    const timer = window.setTimeout(() => {
      const nextSizes = { ...noteSizes };
      let changed = false;
      document.querySelectorAll<HTMLElement>("[data-note-id]").forEach((card) => {
        if (card.scrollHeight <= card.clientHeight) return;
        nextSizes[card.dataset.noteId!] = { width: card.getBoundingClientRect().width, height: card.scrollHeight + 2 };
        changed = true;
      });
      if (changed) setAndPersistSizes(nextSizes);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [noteSizes, notes, structured, user?.id]);
  async function loadNotes(userId?: string) {
    if (!userId) return;
    const { data, error } = await supabase
      .from("tethers")
      .select("id, title, description, tags, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: sortOldest });
    if (!error) setNotes((data as Note[]) ?? []);
  }
  function setAndPersistPositions(next: Record<string, Point>) {
    setPositions(next);
    window.localStorage.setItem(notePositionsKey(user?.id), JSON.stringify(next));
  }
  function setAndPersistSizes(next: Record<string, NoteSize>) {
    setNoteSizes(next);
    window.localStorage.setItem(noteSizesKey(user?.id), JSON.stringify(next));
  }
  const visibleNotes = useMemo(() => {
    const filtered = notes.filter((note) =>
      `${note.title} ${note.description ?? ""} ${(note.tags ?? []).join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
    return [...filtered].sort((first, second) => {
      const difference = new Date(first.created_at).getTime() - new Date(second.created_at).getTime();
      return sortOldest ? difference : -difference;
    });
  }, [notes, search, sortOldest]);
  const allTags = useMemo(
    () => Array.from(new Set(notes.flatMap((note) => note.tags ?? []))),
    [notes],
  );
  const visibleTags = useMemo(
    () => Array.from(new Set([...allTags, ...tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean)])),
    [allTags, tagsInput],
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
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) return setMessage(error.message);
    setUser(null);
    setNotes([]);
    setProfileOpen(false);
    router.replace("/login");
  }
  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    if (!user || !isSupabaseConfigured)
      return setMessage(
        user ? "Add Supabase credentials first." : "Sign in to save notes.",
      );
    const noteTags = applyKeywordTags(
      [...tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean), ...tagsFromBody(body)],
      noteTitle(body, title),
      body,
    );
    ensureTagColors(noteTags);
    const { error } = await supabase.from("tethers").insert({
      user_id: user.id,
      title: noteTitle(body, title),
      description: body.trim(),
      tags: noteTags,
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
    const original = { title: note.title, body: note.description ?? note.title, tags: note.tags?.join(", ") ?? "" };
    setEditingId(note.id);
    editOriginalRef.current = original;
    setEditTitle(original.title);
    setEditBody(original.body);
    setEditTags(original.tags);
  }
  async function persistEdit() {
    if (!editingId || !editBody.trim() || !user || !isSupabaseConfigured) return;
    const nextTitle = noteTitle(editBody, editTitle);
    const nextTags = applyKeywordTags([...editTags.split(",").map((tag) => tag.trim()).filter(Boolean), ...tagsFromBody(editBody)], nextTitle, editBody);
    ensureTagColors(nextTags);
    const { error } = await supabase.from("tethers").update({ title: nextTitle, description: editBody.trim(), tags: nextTags }).eq("id", editingId).eq("user_id", user.id);
    if (error) setMessage(error.message); else { setEditingId(null); setConfirmEditExit(false); await loadNotes(user.id); }
  }
  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await persistEdit();
  }
  function requestEditExit() {
    const changed = editOriginalRef.current.title !== editTitle || editOriginalRef.current.body !== editBody || editOriginalRef.current.tags !== editTags;
    if (changed) setConfirmEditExit(true);
    else setEditingId(null);
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
    const projectedBounds = {
      left: bounds.left + (point.x / 100) * bounds.width,
      top: bounds.top + (point.y / 100) * bounds.height,
      right: bounds.left + (point.x / 100) * bounds.width + noteBounds.width,
      bottom: bounds.top + (point.y / 100) * bounds.height + noteBounds.height,
    };
    const overlapsNote = Array.from(canvas.querySelectorAll<HTMLElement>("[data-note-id]")).some((note) => {
      if (note.dataset.noteId === id) return false;
      const otherBounds = note.getBoundingClientRect();
      return projectedBounds.right > otherBounds.left && projectedBounds.left < otherBounds.right && projectedBounds.bottom > otherBounds.top && projectedBounds.top < otherBounds.bottom;
    });
    const trashBounds = trashRef.current?.getBoundingClientRect();
    const overlapsTrash = Boolean(trashBounds && projectedBounds.right >= trashBounds.left && projectedBounds.left <= trashBounds.right && projectedBounds.bottom >= trashBounds.top && projectedBounds.top <= trashBounds.bottom);
    if (trashHoverRef.current !== overlapsTrash) {
      trashHoverRef.current = overlapsTrash;
      setTrashHover(overlapsTrash);
    }
    if (overlapsNote) return;
    dragRef.current.point = point;
    event.currentTarget.style.left = `${point.x}%`;
    event.currentTarget.style.top = `${point.y}%`;
  }
  async function dropNote(event: PointerEvent<HTMLElement>, id: string) {
    const trashBounds = trashRef.current?.getBoundingClientRect();
    const noteBounds = event.currentTarget.getBoundingClientRect();
    const canvasBounds = event.currentTarget.parentElement?.getBoundingClientRect();
    const drag = dragRef.current;
    setDragging(null);
    dragRef.current = null;
    trashHoverRef.current = false;
    setTrashHover(false);
    const overlapsTrash = Boolean(trashBounds && noteBounds.right >= trashBounds.left && noteBounds.left <= trashBounds.right && noteBounds.bottom >= trashBounds.top && noteBounds.top <= trashBounds.bottom);
    const releasedAboveCanvas = Boolean(canvasBounds && noteBounds.top < canvasBounds.top);
    if (!overlapsTrash && releasedAboveCanvas) {
      if (dragStartPoint.current) setAndPersistPositions({ ...positions, [id]: dragStartPoint.current });
      dragStartPoint.current = null;
      return;
    }
    if (!overlapsTrash) {
      if (drag?.point) setAndPersistPositions({ ...positions, [id]: drag.point });
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
    if (confirmDeleteId && dragStartPoint.current) setAndPersistPositions({ ...positions, [confirmDeleteId]: dragStartPoint.current });
    setConfirmDeleteId(null);
    dragStartPoint.current = null;
  }
  function startDragging(event: PointerEvent<HTMLElement>, id: string) {
    const canvas = event.currentTarget.parentElement;
    if (!canvas) return;
    const noteBounds = event.currentTarget.getBoundingClientRect();
    const bounds = canvas.getBoundingClientRect();
    dragStartPoint.current = positions[id] ?? { x: ((noteBounds.left - bounds.left) / bounds.width) * 100, y: ((noteBounds.top - bounds.top) / bounds.height) * 100 };
    dragRef.current = { id, offsetX: event.clientX - noteBounds.left, offsetY: event.clientY - noteBounds.top, point: dragStartPoint.current };
    setDragging(id);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function startResize(event: PointerEvent<HTMLElement>, id: string, edge: string) {
    event.preventDefault();
    event.stopPropagation();
    const element = event.currentTarget.closest<HTMLElement>("[data-note-id]");
    const canvas = element?.parentElement;
    if (!element || !canvas) return;
    const bounds = element.getBoundingClientRect();
    const canvasBounds = canvas.getBoundingClientRect();
    const savedWidth = element.style.width;
    const savedHeight = element.style.height;
    element.style.removeProperty("width");
    element.style.removeProperty("height");
    const naturalBounds = element.getBoundingClientRect();
    element.style.width = savedWidth;
    element.style.height = savedHeight;
    resizeRef.current = { id, edge, startX: event.clientX, startY: event.clientY, startWidth: bounds.width, startHeight: bounds.height, minWidth: Math.max(180, naturalBounds.width), minHeight: Math.max(100, naturalBounds.height), startPoint: positions[id] ?? { x: ((bounds.left - canvasBounds.left) / canvasBounds.width) * 100, y: ((bounds.top - canvasBounds.top) / canvasBounds.height) * 100 }, element };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function resizeNote(event: PointerEvent<HTMLElement>) {
    const resize = resizeRef.current;
    if (!resize) return;
    const canvas = resize.element.parentElement;
    if (!canvas) return;
    const dx = event.clientX - resize.startX;
    const dy = event.clientY - resize.startY;
    const width = Math.max(resize.minWidth, Math.min(560, resize.startWidth + (resize.edge.includes("e") ? dx : resize.edge.includes("w") ? -dx : 0)));
    const height = Math.max(resize.minHeight, Math.min(720, resize.startHeight + (resize.edge.includes("s") ? dy : resize.edge.includes("n") ? -dy : 0)));
    const point = { x: resize.startPoint.x + (resize.edge.includes("w") ? ((resize.startWidth - width) / canvas.getBoundingClientRect().width) * 100 : 0), y: resize.startPoint.y + (resize.edge.includes("n") ? ((resize.startHeight - height) / canvas.getBoundingClientRect().height) * 100 : 0) };
    resize.element.style.width = `${width}px`;
    resize.element.style.height = `${height}px`;
    resize.element.style.left = `${point.x}%`;
    resize.element.style.top = `${point.y}%`;
    resizeRef.current = { ...resize, startPoint: point, startWidth: width, startHeight: height, startX: event.clientX, startY: event.clientY };
  }
  function stopResize() {
    const resize = resizeRef.current;
    if (!resize) return;
    setAndPersistSizes({ ...noteSizes, [resize.id]: { width: resize.startWidth, height: resize.startHeight } });
    setAndPersistPositions({ ...positions, [resize.id]: resize.startPoint });
    resizeRef.current = null;
  }
  function insertList(marker: "- " | "1. ") {
    const textarea = noteBodyRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const needsNewLine = start > 0 && body[start - 1] !== "\n";
    const lastLine = body.slice(0, start).split("\n").reverse().find((line) => line.trim());
    const lastNumber = marker === "1. " ? lastLine?.match(/^\s*(\d+)[.)]\s+/)?.[1] : undefined;
    const nextMarker = lastNumber ? `${Number(lastNumber) + 1}. ` : marker;
    const insertion = `${needsNewLine ? "\n" : ""}${nextMarker}`;
    const nextValue = `${body.slice(0, start)}${insertion}${body.slice(end)}`;
    setBody(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insertion.length, start + insertion.length);
    });
  }
  function applyKeywordTags(currentTags: string[], noteTitleValue: string, noteBody: string, rules = tagKeywords) {
    const searchableText = `${noteTitleValue} ${noteBody}`.toLowerCase();
    const matchingTags = Object.entries(rules).flatMap(([tag, keywords]) =>
      keywords.some((keyword) => searchableText.includes(keyword.toLowerCase())) ? [tag] : [],
    );
    return Array.from(new Set([...currentTags, ...matchingTags]));
  }

  function ensureTagColors(tags: string[]) {
    const nextColors = { ...tagColors };
    let changed = false;
    tags.forEach((tag) => {
      if (nextColors[tag]) return;
      nextColors[tag] = tagColorPresets[0];
      changed = true;
    });
    if (!changed) return;
    setTagColors(nextColors);
    window.localStorage.setItem("tether-tag-colors", JSON.stringify(nextColors));
  }

  async function addTag() {
    if (!newTag.trim()) return;
    const tag = `${tagType}:${newTag.trim().replace(/\s+/g, "-")}`;
    const keywords = newTagKeywords.split(",").map((keyword) => keyword.trim()).filter(Boolean);
    const nextKeywords = { ...tagKeywords, ...(keywords.length ? { [tag]: keywords } : {}) };
    const nextColors = { ...tagColors, [tag]: newTagColor };
    setTagColors(nextColors);
    window.localStorage.setItem("tether-tag-colors", JSON.stringify(nextColors));
    setTagKeywords(nextKeywords);
    window.localStorage.setItem("tether-tag-keywords", JSON.stringify(nextKeywords));
    const updatedNotes = notes.map((note) => ({ ...note, tags: applyKeywordTags(note.tags ?? [], note.title, note.description ?? note.title, nextKeywords) }));
    const changedNotes = updatedNotes.filter((note, index) => note.tags?.join(",") !== (notes[index].tags ?? []).join(","));
    if (isSupabaseConfigured && user && changedNotes.length) {
      const results = await Promise.all(changedNotes.map((note) => supabase.from("tethers").update({ tags: note.tags }).eq("id", note.id).eq("user_id", user.id)));
      const error = results.find((result) => result.error)?.error;
      if (error) return setMessage(error.message);
    }
    setNotes(updatedNotes);
    setTagsInput((current) => (current ? `${current}, ${tag}` : tag));
    setNewTag("");
    setNewTagKeywords("");
    setNewTagColor(tagColorPresets[0]);
    setNewTagColorHex(tagColorPresets[0]);
    setCustomColorOpen(false);
    setTagPickerOpen(false);
  }

  async function replaceTag(currentTag: string, replacement?: string) {
    const nextTag = replacement?.trim().replace(/\s+/g, "-");
    if (replacement && !nextTag) return;
    const changedNotes = notes.filter((note) => note.tags?.includes(currentTag));
    const updatedNotes = notes.map((note) => ({
      ...note,
      tags: note.tags?.flatMap((tag) => tag === currentTag ? (nextTag ? [nextTag] : []) : [tag]) ?? [],
    }));
    if (isSupabaseConfigured && user && changedNotes.length) {
      const results = await Promise.all(changedNotes.map((note) => {
        const updated = updatedNotes.find((item) => item.id === note.id);
        return supabase.from("tethers").update({ tags: updated?.tags ?? [] }).eq("id", note.id).eq("user_id", user.id);
      }));
      const error = results.find((result) => result.error)?.error;
      if (error) return setMessage(error.message);
    }
    setNotes(updatedNotes);
    setTagsInput((current) => current.split(",").map((tag) => tag.trim()).filter(Boolean).flatMap((tag) => tag === currentTag ? (nextTag ? [nextTag] : []) : [tag]).join(", "));
    setTagColors((current) => {
      const next = { ...current };
      const color = next[currentTag];
      delete next[currentTag];
      if (nextTag && color) next[nextTag] = color;
      window.localStorage.setItem("tether-tag-colors", JSON.stringify(next));
      return next;
    });
    setTagKeywords((current) => {
      const next = { ...current };
      const keywords = next[currentTag];
      delete next[currentTag];
      if (nextTag && keywords) next[nextTag] = keywords;
      window.localStorage.setItem("tether-tag-keywords", JSON.stringify(next));
      return next;
    });
    setSelectedTag(null);
    setTagEditValue("");
  }

  function beginTagEdit(tag: string) {
    const [type, ...nameParts] = tag.split(":");
    setSelectedTag(tag);
    setTagEditType(type === "sub" ? "sub" : "main");
    setTagEditValue(nameParts.join(":") || tag);
    setTagEditColor(tagColors[tag] ?? tagColorPresets[0]);
    setTagEditColorHex(tagColors[tag] ?? tagColorPresets[0]);
    setTagEditKeywords((tagKeywords[tag] ?? []).join(", "));
    setEditCustomColorOpen(false);
  }

  async function saveTagDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTag || !tagEditValue.trim()) return;
    const nextTag = `${tagEditType}:${tagEditValue.trim().replace(/\s+/g, "-")}`;
    const keywords = tagEditKeywords.split(",").map((keyword) => keyword.trim()).filter(Boolean);
    const nextRules = { ...tagKeywords };
    delete nextRules[selectedTag];
    if (keywords.length) nextRules[nextTag] = keywords;
    const updatedNotes = notes.map((note) => {
      const renamedTags = (note.tags ?? []).map((tag) => tag === selectedTag ? nextTag : tag);
      return { ...note, tags: applyKeywordTags(renamedTags, note.title, note.description ?? note.title, nextRules) };
    });
    const changedNotes = updatedNotes.filter((note, index) => note.tags?.join(",") !== (notes[index].tags ?? []).join(","));
    if (isSupabaseConfigured && user && changedNotes.length) {
      const results = await Promise.all(changedNotes.map((note) => supabase.from("tethers").update({ tags: note.tags }).eq("id", note.id).eq("user_id", user.id)));
      const error = results.find((result) => result.error)?.error;
      if (error) return setMessage(error.message);
    }
    const nextColors = { ...tagColors };
    delete nextColors[selectedTag];
    nextColors[nextTag] = tagEditColor;
    setNotes(updatedNotes);
    setTagsInput((current) => current.split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => tag === selectedTag ? nextTag : tag).join(", "));
    setTagColors(nextColors);
    setTagKeywords(nextRules);
    window.localStorage.setItem("tether-tag-colors", JSON.stringify(nextColors));
    window.localStorage.setItem("tether-tag-keywords", JSON.stringify(nextRules));
    setSelectedTag(null);
    setEditCustomColorOpen(false);
  }

  function updateTagColorHex(value: string) {
    const normalized = value.startsWith("#") ? value : `#${value}`;
    if (!/^#[0-9a-fA-F]{0,6}$/.test(normalized)) return;
    setNewTagColorHex(normalized);
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) setNewTagColor(normalized);
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
            <span className={`${GeistSans.className} brand-wordmark`}>TETHER</span>
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
              <button className="menu-signout" onClick={() => void signOut()}>
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
            <button className="tag-picker-trigger" onClick={() => { setTagPickerOpen(!tagPickerOpen); setCustomColorOpen(false); setTagEditorOpen(false); }} aria-expanded={tagPickerOpen}>
              <Tag size={15} /> Add Tag
            </button>
            <div className={`tag-picker-menu ${tagPickerOpen ? "is-open" : ""}`} aria-hidden={!tagPickerOpen}><strong>Choose tag type</strong><div className="tag-type-buttons"><button type="button" className={tagType === "main" ? "selected" : ""} onClick={() => setTagType("main")}>Main tag</button><button type="button" className={tagType === "sub" ? "selected" : ""} onClick={() => setTagType("sub")}>Sub tag</button></div><div className="tag-color-presets">{tagColorPresets.map((color) => <button type="button" key={color} aria-label={`Use ${color} tag color`} className={newTagColor === color ? "selected" : ""} style={{ backgroundColor: color }} onClick={() => { setNewTagColor(color); setNewTagColorHex(color); setCustomColorOpen(false); }} />)}<button type="button" className={`custom-color-button ${customColorOpen ? "selected" : ""}`} aria-label="Choose a custom tag color" aria-expanded={customColorOpen} onClick={() => setCustomColorOpen(!customColorOpen)}><Palette size={13} /></button><div className={`custom-color-menu ${customColorOpen ? "is-open" : ""}`} aria-hidden={!customColorOpen}><label className="tag-color-picker">Color wheel<input type="color" value={newTagColor} onChange={(event) => { setNewTagColor(event.target.value); setNewTagColorHex(event.target.value); }} /></label><input className="tag-color-hex" value={newTagColorHex} onChange={(event) => updateTagColorHex(event.target.value)} placeholder="#48aff5" aria-label="Custom tag color hex" /></div></div><div className="tag-entry"><input autoFocus value={newTag} onChange={(event) => setNewTag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addTag(); }} placeholder={`${tagType} tag`} /><button type="button" onClick={() => void addTag()}>Add</button></div><label className="tag-keyword-entry">Keywords<input value={newTagKeywords} onChange={(event) => setNewTagKeywords(event.target.value)} placeholder="e.g. project, launch" /></label></div>
            <button className="tag-editor-trigger" onClick={() => { setTagEditorOpen(!tagEditorOpen); setTagPickerOpen(false); setCustomColorOpen(false); setSelectedTag(null); }} aria-expanded={tagEditorOpen}>
              <Edit3 size={15} /> Edit Tags
            </button>
            <div className={`tag-editor-menu ${tagEditorOpen ? "is-open" : ""}`} aria-hidden={!tagEditorOpen}><strong>Edit tags</strong>{visibleTags.length ? <div className="tag-editor-list">{visibleTags.map((tag) => <button type="button" className={selectedTag === tag ? "selected" : ""} key={tag} onClick={() => beginTagEdit(tag)}><Hash size={12} /> {tag}</button>)}</div> : <span>No tags yet.</span>}{selectedTag && <form className="tag-editor-form" onSubmit={saveTagDetails}><div className="tag-type-buttons"><button type="button" className={tagEditType === "main" ? "selected" : ""} onClick={() => setTagEditType("main")}>Main tag</button><button type="button" className={tagEditType === "sub" ? "selected" : ""} onClick={() => setTagEditType("sub")}>Sub tag</button></div><input value={tagEditValue} onChange={(event) => setTagEditValue(event.target.value)} aria-label="Edit tag name" placeholder="Tag name" /><div className="tag-color-presets">{tagColorPresets.map((color) => <button type="button" key={color} aria-label={`Use ${color} edit tag color`} className={tagEditColor === color ? "selected" : ""} style={{ backgroundColor: color }} onClick={() => { setTagEditColor(color); setTagEditColorHex(color); setEditCustomColorOpen(false); }} />)}<button type="button" className={`custom-color-button ${editCustomColorOpen ? "selected" : ""}`} aria-label="Choose a custom edit tag color" aria-expanded={editCustomColorOpen} onClick={() => setEditCustomColorOpen(!editCustomColorOpen)}><Palette size={13} /></button></div><div className={`tag-editor-custom-controls ${editCustomColorOpen ? "is-open" : ""}`}><label className="tag-color-picker">Color wheel<input type="color" value={tagEditColor} onChange={(event) => { setTagEditColor(event.target.value); setTagEditColorHex(event.target.value); }} /></label><input className="tag-color-hex" value={tagEditColorHex} onChange={(event) => { const value = event.target.value.startsWith("#") ? event.target.value : `#${event.target.value}`; if (!/^#[0-9a-fA-F]{0,6}$/.test(value)) return; setTagEditColorHex(value); if (/^#[0-9a-fA-F]{6}$/.test(value)) setTagEditColor(value); }} placeholder="#48aff5" aria-label="Custom edit tag color hex" /></div><label className="tag-keyword-entry">Keywords<input value={tagEditKeywords} onChange={(event) => setTagEditKeywords(event.target.value)} placeholder="e.g. project, launch" /></label><div className="tag-editor-actions"><button type="submit">Save</button><button type="button" className="delete-tag-button" onClick={() => void replaceTag(selectedTag)} aria-label="Delete tag"><Trash2 size={13} /></button></div></form>}</div>
            {visibleTags.map((tag) => (
              <span className="tag-chip" key={tag} style={tagChipStyle(tagColors[tag])}><Hash size={12} /> {tag}</span>
            ))}
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
          <form className="capture-form" onSubmit={saveNote}>
              <input
                maxLength={80}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Title"
              />
              <textarea
                autoFocus
                ref={noteBodyRef}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Jot it down... Use #tag or ##tag"
                rows={5}
              />
              <div className="list-tools" aria-label="Insert list">
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insertList("- ")} aria-label="Insert bullet list" title="Insert bullet list">•</button>
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insertList("1. ")} aria-label="Insert numbered list" title="Insert numbered list">1.</button>
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
          {message && <p className="message">{message}</p>}
        </section>
        <section className="notes-panel">
          <div className="notes-heading">
            <div className="section-label">
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
          <div className="notes-canvas" style={{ minHeight: `${Math.max(540, visibleNotes.length * 560)}px` }}>
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
                const point = positions[note.id] ?? initialNotePoint(index, visibleNotes.length);
                const size = noteSizes[note.id];
                const noteTagColor = note.outline_color ?? note.tags?.map((tag) => tagColors[tag]).find(Boolean);
                return (
                  <article
                    className={`note-card ${noteTagColor ? "has-tag-color" : ""} ${dragging === note.id ? "is-dragging" : ""} ${dragging === note.id && trashHover ? "is-trash-hover" : ""}`}
                    key={note.id}
                    data-note-id={note.id}
                    style={{ left: `${point.x}%`, top: `${point.y}%`, width: size?.width, height: size?.height, "--note-card-tag-color": noteTagColor } as CSSProperties}
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
                          <span className="tag-chip" key={tag} style={tagChipStyle(tagColors[tag] ?? note.outline_color ?? undefined)}><Hash size={11} /> {tag}</span>
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
                    {editingId === note.id ? <form className="note-edit-form" onSubmit={saveEdit} onPointerDown={(event) => event.stopPropagation()}><input className="note-edit-title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} placeholder="Title" /><textarea className="note-edit-body" autoFocus value={editBody} onChange={(event) => setEditBody(event.target.value)} rows={5} placeholder="Write your note..." /><label className="note-edit-tags"><Tag size={13} /><input value={editTags} onChange={(event) => setEditTags(event.target.value)} placeholder="Add tags" /></label><div className="note-edit-actions"><button type="button" className="cancel-button" onClick={requestEditExit}>Cancel</button><button className="primary-button" disabled={!editBody.trim()}>Save changes</button></div><div className="note-resize-handles" aria-label="Resize note">{["n", "e", "s", "w", "ne", "se", "sw", "nw"].map((edge) => <button type="button" key={edge} aria-label={`Resize note ${edge}`} className={`resize-handle resize-${edge}`} onPointerDown={(event) => startResize(event, note.id, edge)} onPointerMove={resizeNote} onPointerUp={stopResize} />)}</div></form> : <>{note.description && note.description !== note.title && <h3>{note.title}</h3>}{renderNoteContent(note.description ?? note.title)}</>}
                  </article>
                );
              })
            )}
          </div>
        </section>
        {confirmDeleteId && <div className="confirm-backdrop" role="presentation" onMouseDown={cancelDelete}><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="trash-title" onMouseDown={(event) => event.stopPropagation()}><span className="confirm-icon"><Trash2 size={20} /></span><h2 id="trash-title">Move this note to Trash?</h2><p>This note will be removed from your workspace.</p><div className="confirm-actions"><button className="cancel-button" onClick={cancelDelete}>Cancel</button><button className="delete-button" onClick={() => void confirmDelete()}>Move to Trash</button></div></div></div>}
        {confirmEditExit && <div className="confirm-backdrop" role="presentation"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-exit-title"><h2 id="edit-exit-title">Save your changes?</h2><p>You changed this note. Save before leaving edit mode?</p><div className="confirm-actions"><button className="cancel-button" onClick={() => setConfirmEditExit(false)}>Keep editing</button><button className="cancel-button" onClick={() => { setEditingId(null); setConfirmEditExit(false); }}>Discard</button><button className="primary-button" onClick={() => void persistEdit()}>Save changes</button></div></div></div>}
        <footer>
          <span>Ideas have somewhere to land.</span>
          <span>Free to use. Yours to keep.</span>
        </footer>
      </div>
    </main>
  );
}
