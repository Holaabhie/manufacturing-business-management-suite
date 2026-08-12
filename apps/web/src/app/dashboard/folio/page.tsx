"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  Calendar,
  DollarSign,
  TrendingUp,
  Tag,
  FileText,
  StickyNote,
  AlertCircle,
  RefreshCw,
  X,
  Receipt,
  IndianRupee,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { staggerContainer, staggerItem } from "@/styles/animations";

// ─── Types ──────────────────────────────────────────────
interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface Note {
  id: string;
  title: string;
  body: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

type ActiveTab = "expenses" | "notes";

const CATEGORIES = ["Food", "Travel", "Office", "Utilities", "Other"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#F59E0B",
  Travel: "#2563EB",
  Office: "#8B5CF6",
  Utilities: "#16A34A",
  Other: "#6B7280",
};

const CATEGORY_BG: Record<string, string> = {
  Food: "rgba(245, 158, 11, 0.12)",
  Travel: "rgba(37, 99, 235, 0.12)",
  Office: "rgba(139, 92, 246, 0.12)",
  Utilities: "rgba(22, 163, 74, 0.12)",
  Other: "rgba(107, 114, 128, 0.12)",
};

// ─── Empty State illustration (inline SVG) ──────────────
function EmptyExpensesIllustration() {
  return (
    <svg width="160" height="140" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="20" width="100" height="100" rx="20" fill="var(--muted)" />
      <rect x="45" y="45" width="70" height="8" rx="4" fill="var(--border)" />
      <rect x="45" y="60" width="50" height="8" rx="4" fill="var(--border)" />
      <rect x="45" y="75" width="60" height="8" rx="4" fill="var(--border)" />
      <circle cx="120" cy="100" r="22" fill="#2563EB" opacity="0.15" />
      <path d="M113 100h14M120 93v14" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="40" cy="30" r="8" fill="#F59E0B" opacity="0.2" />
      <circle cx="130" cy="35" r="6" fill="#8B5CF6" opacity="0.15" />
    </svg>
  );
}

function EmptyNotesIllustration() {
  return (
    <svg width="160" height="140" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="15" width="50" height="60" rx="10" fill="var(--muted)" transform="rotate(-6 25 15)" />
      <rect x="55" y="25" width="50" height="60" rx="10" fill="var(--border)" transform="rotate(3 55 25)" />
      <rect x="40" y="35" width="50" height="60" rx="10" fill="#2563EB" opacity="0.12" />
      <rect x="50" y="50" width="30" height="5" rx="2.5" fill="#2563EB" opacity="0.3" />
      <rect x="50" y="60" width="22" height="5" rx="2.5" fill="#2563EB" opacity="0.2" />
      <circle cx="120" cy="100" r="22" fill="#16A34A" opacity="0.15" />
      <path d="M113 100h14M120 93v14" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="130" cy="30" r="8" fill="#EC4899" opacity="0.15" />
    </svg>
  );
}

// ─── Skeleton Loaders ───────────────────────────────────
function ExpensesSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[88px] rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="rounded-lg bg-muted overflow-hidden">
        <div className="h-[48px] bg-accent animate-pulse" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[52px] border-t border-border animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    </div>
  );
}

function NotesSkeleton() {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
      {[120, 160, 100, 140, 180, 110].map((h, i) => (
        <div
          key={i}
          className="break-inside-avoid rounded-lg bg-muted animate-pulse"
          style={{ height: `${h}px`, animationDelay: `${i * 0.08}s` }}
        />
      ))}
    </div>
  );
}

// ─── Error State ────────────────────────────────────────
function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 gap-4"
    >
      <div
        className="w-14 h-14 rounded-lg flex items-center justify-center bg-destructive/10"
      >
        <AlertCircle className="w-6 h-6 text-destructive" />
      </div>
      <div className="text-center">
        <p className="text-[16px] font-semibold text-foreground mb-1">
          Something went wrong
        </p>
        <p className="text-[13px] text-muted-foreground max-w-[300px]">
          {message}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium text-white bg-primary hover:bg-primary/90 cursor-pointer transition-colors active:scale-[0.98]"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════
// FOLIO PAGE
// ═════════════════════════════════════════════════════════
export default function FolioPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("expenses");

  // ─── Expense State ──────────────────────────────────
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [expensesError, setExpensesError] = useState<string | null>(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "Other" as string,
    amount: "",
    description: "",
  });
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // ─── Notes State ────────────────────────────────────
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteForm, setNoteForm] = useState({ title: "", body: "" });
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // ─── Fetch Expenses ─────────────────────────────────
  const fetchExpenses = useCallback(async () => {
    setExpensesLoading(true);
    setExpensesError(null);
    try {
      const res = await fetch("/api/expenses");
      if (!res.ok) throw new Error("Failed to load expenses");
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setExpensesError(err.message || "Unknown error");
    } finally {
      setExpensesLoading(false);
    }
  }, []);

  // ─── Fetch Notes ────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    setNotesLoading(true);
    setNotesError(null);
    try {
      const res = await fetch("/api/notes");
      if (!res.ok) throw new Error("Failed to load notes");
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setNotesError(err.message || "Unknown error");
    } finally {
      setNotesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchNotes();
  }, [fetchExpenses, fetchNotes]);

  // ─── Expense CRUD ───────────────────────────────────
  const openAddExpense = () => {
    setEditingExpense(null);
    setExpenseForm({
      date: new Date().toISOString().split("T")[0],
      category: "Other",
      amount: "",
      description: "",
    });
    setExpenseModalOpen(true);
  };

  const openEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpenseForm({
      date: exp.date?.split("T")[0] || "",
      category: exp.category,
      amount: String(exp.amount),
      description: exp.description,
    });
    setExpenseModalOpen(true);
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) return;
    setSavingExpense(true);
    try {
      if (editingExpense) {
        await fetch(`/api/expenses/${editingExpense.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(expenseForm),
        });
      } else {
        await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(expenseForm),
        });
      }
      setExpenseModalOpen(false);
      fetchExpenses();
    } catch (err) {
      console.error("Failed to save expense:", err);
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setDeletingExpenseId(id);
    try {
      await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      fetchExpenses();
    } catch (err) {
      console.error("Failed to delete expense:", err);
    } finally {
      setDeletingExpenseId(null);
    }
  };

  // ─── Note CRUD ──────────────────────────────────────
  const openAddNote = () => {
    setEditingNote(null);
    setNoteForm({ title: "", body: "" });
    setNoteModalOpen(true);
  };

  const openEditNote = (note: Note) => {
    setEditingNote(note);
    setNoteForm({ title: note.title, body: note.body });
    setNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!noteForm.title.trim() && !noteForm.body.trim()) return;
    setSavingNote(true);
    try {
      if (editingNote) {
        await fetch(`/api/notes/${editingNote.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(noteForm),
        });
      } else {
        await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(noteForm),
        });
      }
      setNoteModalOpen(false);
      fetchNotes();
    } catch (err) {
      console.error("Failed to save note:", err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    setDeletingNoteId(id);
    try {
      await fetch(`/api/notes/${id}`, { method: "DELETE" });
      fetchNotes();
    } catch (err) {
      console.error("Failed to delete note:", err);
    } finally {
      setDeletingNoteId(null);
    }
  };

  // ─── Expense computed stats ─────────────────────────
  const expenseStats = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    const now = new Date();
    const thisMonth = expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const categoryTotals: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });
    const topCategory =
      Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0]?.[0] || "—";

    return { total, thisMonth, topCategory };
  }, [expenses]);

  // ─── Helpers ────────────────────────────────────────
  const formatCurrency = (v: number) => `\u20B9${v.toLocaleString("en-IN")}`;
  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };
  const formatTimeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(d);
  };

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* ── Page Header ── */}
      <motion.div variants={staggerItem}>
        <h1 className="text-[24px] font-semibold text-foreground leading-tight">
          Folio
        </h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Track expenses and capture quick notes.
        </p>
      </motion.div>

      {/* ── Pill Tab Switcher ── */}
      <motion.div variants={staggerItem} className="flex justify-center">
        <div
          className="inline-flex rounded-md p-[3px] gap-[2px] bg-muted border border-border"
          style={{
            background: "var(--muted)",
            border: "1px solid var(--border)",
          }}
        >
          {(["expenses", "notes"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative px-6 py-2 rounded-md text-[13px] font-medium transition-all duration-200 cursor-pointer",
                  isActive
                    ? "text-white bg-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                style={undefined}
              >
                <span className="flex items-center gap-2">
                  {tab === "expenses" ? (
                    <Receipt className="w-4 h-4" />
                  ) : (
                    <StickyNote className="w-4 h-4" />
                  )}
                  {tab === "expenses" ? "Expenses" : "Notes"}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        {activeTab === "expenses" ? (
          <motion.div
            key="expenses-tab"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* ════════════ EXPENSES TAB ════════════ */}
            {expensesLoading ? (
              <ExpensesSkeleton />
            ) : expensesError ? (
              <ErrorCard message={expensesError} onRetry={fetchExpenses} />
            ) : (
              <div className="space-y-5">
                {/* ── Summary Bar ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: "Total Spent",
                      value: formatCurrency(expenseStats.total),
                      icon: IndianRupee,
                      color: "#2563EB",
                      bg: "rgba(37, 99, 235, 0.10)",
                      glow: "rgba(37, 99, 235, 0.15)",
                    },
                    {
                      label: "This Month",
                      value: formatCurrency(expenseStats.thisMonth),
                      icon: Calendar,
                      color: "#16A34A",
                      bg: "rgba(22, 163, 74, 0.10)",
                      glow: "rgba(22, 163, 74, 0.15)",
                    },
                    {
                      label: "Top Category",
                      value: expenseStats.topCategory,
                      icon: Tag,
                      color: "#8B5CF6",
                      bg: "rgba(139, 92, 246, 0.10)",
                      glow: "rgba(139, 92, 246, 0.15)",
                    },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="relative overflow-hidden rounded-[14px] p-4"
                      style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        boxShadow: `0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px ${stat.glow}`,
                      }}
                    >
                      {/* Background glow */}
                      <div
                        className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-40"
                        style={{ background: stat.color }}
                      />
                      <div className="flex items-center gap-3 relative z-10">
                        <div
                          className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center flex-shrink-0"
                          style={{ background: stat.bg }}
                        >
                          <stat.icon className="w-[20px] h-[20px]" style={{ color: stat.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                            {stat.label}
                          </p>
                          <p className="text-[18px] font-semibold text-foreground truncate leading-tight mt-0.5 tabular-nums">
                            {stat.value}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* ── Add Button ── */}
                <div className="flex justify-end">
                  <button
                    onClick={openAddExpense}
                    className="flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium text-white bg-primary hover:bg-primary/90 cursor-pointer transition-colors active:scale-[0.97]"
                  >
                    <Plus className="w-4 h-4" />
                    Add Expense
                  </button>
                </div>

                {/* ── Table or Empty ── */}
                {expenses.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16 gap-3"
                  >
                    <EmptyExpensesIllustration />
                    <p className="text-[16px] font-semibold text-foreground">
                      No expenses yet
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      Tap &ldquo;Add Expense&rdquo; to start tracking your spending.
                    </p>
                  </motion.div>
                ) : (
                  <div
                    className="rounded-[14px] overflow-hidden"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }}
                  >
                    {/* Desktop Table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr
                            style={{
                              background: "var(--muted)",
                              borderBottom: "1px solid var(--border)",
                            }}
                          >
                            {["Date", "Category", "Amount", "Description", ""].map(
                              (h) => (
                                <th
                                  key={h}
                                  className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                                >
                                  {h}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.map((exp, idx) => (
                            <motion.tr
                              key={exp.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                delay: idx * 0.03,
                                duration: 0.3,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                              className="group transition-colors hover:bg-[var(--muted)]"
                              style={{
                                borderBottom:
                                  idx < expenses.length - 1
                                    ? "1px solid var(--border)"
                                    : undefined,
                              }}
                            >
                              <td className="px-4 py-3 text-[13px] text-foreground font-medium whitespace-nowrap">
                                {formatDate(exp.date)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold"
                                  style={{
                                    color: CATEGORY_COLORS[exp.category] || "#6B7280",
                                    background: CATEGORY_BG[exp.category] || "var(--muted)",
                                  }}
                                >
                                  {exp.category}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[13px] font-semibold text-foreground tabular-nums">
                                {formatCurrency(exp.amount)}
                              </td>
                              <td className="px-4 py-3 text-[13px] text-muted-foreground max-w-[200px] truncate">
                                {exp.description || "—"}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => openEditExpense(exp)}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                                    title="Edit"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteExpense(exp.id)}
                                    disabled={deletingExpenseId === exp.id}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer disabled:opacity-50"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                        {/* Totals footer */}
                        <tfoot>
                          <tr
                            style={{
                              background: "var(--muted)",
                              borderTop: "2px solid var(--border)",
                            }}
                          >
                            <td className="px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
                              Total
                            </td>
                            <td />
                            <td className="px-4 py-3 text-[14px] font-semibold text-primary tabular-nums">
                              {formatCurrency(expenseStats.total)}
                            </td>
                            <td />
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Mobile Card List */}
                    <div className="sm:hidden divide-y divide-[var(--border)]">
                      {expenses.map((exp) => (
                        <div key={exp.id} className="p-4 flex items-center gap-3">
                          <div
                            className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center flex-shrink-0"
                            style={{
                              background: CATEGORY_BG[exp.category] || "var(--muted)",
                            }}
                          >
                            <Tag
                              className="w-5 h-5"
                              style={{
                                color: CATEGORY_COLORS[exp.category] || "#6B7280",
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-[14px] font-semibold text-foreground">
                                {formatCurrency(exp.amount)}
                              </p>
                              <span
                                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                                style={{
                                  color:
                                    CATEGORY_COLORS[exp.category] || "#6B7280",
                                  background:
                                    CATEGORY_BG[exp.category] || "var(--muted)",
                                }}
                              >
                                {exp.category}
                              </span>
                            </div>
                            <p className="text-[13px] text-muted-foreground truncate">
                              {exp.description || "—"}
                            </p>
                            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                              {formatDate(exp.date)}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 rounded-[8px] text-[var(--muted-foreground)] hover:bg-[var(--muted)] cursor-pointer">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-[12px] min-w-[140px]">
                              <DropdownMenuItem
                                onClick={() => openEditExpense(exp)}
                                className="rounded-[8px] gap-2 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="rounded-[8px] gap-2 cursor-pointer text-[var(--destructive)] focus:text-[var(--destructive)]"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                      {/* Mobile totals */}
                      <div
                        className="p-4 flex items-center justify-between"
                        style={{ background: "var(--muted)" }}
                      >
                        <span className="text-[13px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                          Total
                        </span>
                        <span className="text-[15px] font-semibold text-primary tabular-nums">
                          {formatCurrency(expenseStats.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="notes-tab"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* ════════════ NOTES TAB ════════════ */}
            {notesLoading ? (
              <NotesSkeleton />
            ) : notesError ? (
              <ErrorCard message={notesError} onRetry={fetchNotes} />
            ) : notes.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 gap-3"
              >
                <EmptyNotesIllustration />
                <p className="text-[16px] font-semibold text-foreground">
                  No notes yet
                </p>
                <p className="text-[13px] text-muted-foreground">
                  Tap the + button to jot down something.
                </p>
              </motion.div>
            ) : (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
                {notes.map((note, idx) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: idx * 0.04,
                      duration: 0.4,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="break-inside-avoid mb-4 group"
                  >
                    <div
                      className="rounded-[14px] overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                      style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                        borderLeft: `4px solid ${note.color}`,
                      }}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-[15px] font-semibold text-[var(--foreground)] leading-tight line-clamp-2">
                            {note.title || "Untitled"}
                          </h3>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded-[6px] text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 hover:text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-all cursor-pointer flex-shrink-0">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-[12px] min-w-[130px]">
                              <DropdownMenuItem
                                onClick={() => openEditNote(note)}
                                className="rounded-[8px] gap-2 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteNote(note.id)}
                                className="rounded-[8px] gap-2 cursor-pointer text-[var(--destructive)] focus:text-[var(--destructive)]"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {note.body && (
                          <p
                            className="text-[13px] text-[var(--muted-foreground)] leading-[18px] mb-3"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {note.body}
                          </p>
                        )}
                        <p className="text-[11px] text-[var(--muted-foreground)] font-medium">
                          {formatTimeAgo(note.updatedAt || note.createdAt)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* ── FAB (Floating Add Button) ── */}
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 20 }}
              onClick={openAddNote}
              className="fixed bottom-24 md:bottom-8 right-6 md:right-10 w-[56px] h-[56px] rounded-full flex items-center justify-center text-white cursor-pointer z-40 transition-transform hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, var(--primary), var(--chart-5))",
                boxShadow:
                  "0 6px 24px rgba(0, 122, 255, 0.4), 0 0 0 1px rgba(255,255,255,0.1)",
              }}
            >
              <Plus className="w-6 h-6" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════ EXPENSE MODAL ════════════ */}
      <Dialog open={expenseModalOpen} onOpenChange={setExpenseModalOpen}>
        <DialogContent fullScreenMobile className="sm:max-w-[480px] !rounded-3xl !p-6 gap-0 overflow-hidden border border-gray-100 dark:border-white/10 bg-white dark:bg-[#161B27] shadow-xl shadow-black/5 dark:shadow-black/40">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">Track business spending</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Date */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Date
              </label>
              <input
                type="date"
                value={expenseForm.date}
                onChange={(e) =>
                  setExpenseForm((p) => ({ ...p, date: e.target.value }))
                }
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm transition-all"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Category
              </label>
              <select
                value={expenseForm.category}
                onChange={(e) =>
                  setExpenseForm((p) => ({ ...p, category: e.target.value }))
                }
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm transition-all appearance-none cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Amount (INR)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm((p) => ({ ...p, amount: e.target.value }))
                }
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm transition-all"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Description
              </label>
              <input
                type="text"
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="What was this for?"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <DialogClose asChild>
                <button className="flex-1 py-3 px-4 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-all cursor-pointer">
                  Cancel
                </button>
              </DialogClose>
              <button
                onClick={handleSaveExpense}
                disabled={savingExpense || !expenseForm.amount || Number(expenseForm.amount) <= 0}
                className="flex-1 py-3 px-4 bg-[#2563EB] hover:bg-[#1D51C8] text-white font-semibold rounded-xl transition-all duration-150 shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] cursor-pointer text-sm"
              >
                {savingExpense
                  ? "Saving…"
                  : editingExpense
                  ? "Save Changes"
                  : "Add Expense"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════ NOTE MODAL ════════════ */}
      <Dialog open={noteModalOpen} onOpenChange={setNoteModalOpen}>
        <DialogContent fullScreenMobile className="sm:max-w-[520px] !rounded-3xl !p-6 gap-0 overflow-hidden border border-gray-100 dark:border-white/10 bg-white dark:bg-[#161B27] shadow-xl shadow-black/5 dark:shadow-black/40">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <StickyNote className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">{editingNote ? "Edit Note" : "New Note"}</DialogTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">Quick business notes</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Title
              </label>
              <input
                type="text"
                value={noteForm.title}
                onChange={(e) =>
                  setNoteForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Quick title…"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm transition-all"
              />
            </div>

            {/* Body */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Note
              </label>
              <textarea
                value={noteForm.body}
                onChange={(e) =>
                  setNoteForm((p) => ({ ...p, body: e.target.value }))
                }
                placeholder="Write your note here…"
                rows={6}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-sm resize-none min-h-[120px] transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <DialogClose asChild>
                <button className="flex-1 py-3 px-4 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-all cursor-pointer">
                  Cancel
                </button>
              </DialogClose>
              <button
                onClick={handleSaveNote}
                disabled={
                  savingNote ||
                  (!noteForm.title.trim() && !noteForm.body.trim())
                }
                className="flex-1 py-3 px-4 bg-[#2563EB] hover:bg-[#1D51C8] text-white font-semibold rounded-xl transition-all duration-150 shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] cursor-pointer text-sm"
              >
                {savingNote
                  ? "Saving…"
                  : editingNote
                  ? "Save Changes"
                  : "Create Note"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
