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
  Food: "var(--ios-orange)",
  Travel: "var(--ios-blue)",
  Office: "var(--ios-purple)",
  Utilities: "var(--ios-green)",
  Other: "var(--ios-gray)",
};

const CATEGORY_BG: Record<string, string> = {
  Food: "rgba(255, 149, 0, 0.12)",
  Travel: "rgba(0, 122, 255, 0.12)",
  Office: "rgba(175, 82, 222, 0.12)",
  Utilities: "rgba(52, 199, 89, 0.12)",
  Other: "rgba(142, 142, 147, 0.12)",
};

// ─── Empty State illustration (inline SVG) ──────────────
function EmptyExpensesIllustration() {
  return (
    <svg width="160" height="140" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="20" width="100" height="100" rx="20" fill="var(--fill-quaternary)" />
      <rect x="45" y="45" width="70" height="8" rx="4" fill="var(--fill-tertiary)" />
      <rect x="45" y="60" width="50" height="8" rx="4" fill="var(--fill-tertiary)" />
      <rect x="45" y="75" width="60" height="8" rx="4" fill="var(--fill-tertiary)" />
      <circle cx="120" cy="100" r="22" fill="var(--ios-blue)" opacity="0.15" />
      <path d="M113 100h14M120 93v14" stroke="var(--ios-blue)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="40" cy="30" r="8" fill="var(--ios-orange)" opacity="0.2" />
      <circle cx="130" cy="35" r="6" fill="var(--ios-purple)" opacity="0.15" />
    </svg>
  );
}

function EmptyNotesIllustration() {
  return (
    <svg width="160" height="140" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="15" width="50" height="60" rx="10" fill="var(--fill-quaternary)" transform="rotate(-6 25 15)" />
      <rect x="55" y="25" width="50" height="60" rx="10" fill="var(--fill-tertiary)" transform="rotate(3 55 25)" />
      <rect x="40" y="35" width="50" height="60" rx="10" fill="var(--ios-blue)" opacity="0.12" />
      <rect x="50" y="50" width="30" height="5" rx="2.5" fill="var(--ios-blue)" opacity="0.3" />
      <rect x="50" y="60" width="22" height="5" rx="2.5" fill="var(--ios-blue)" opacity="0.2" />
      <circle cx="120" cy="100" r="22" fill="var(--ios-green)" opacity="0.15" />
      <path d="M113 100h14M120 93v14" stroke="var(--ios-green)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="130" cy="30" r="8" fill="var(--ios-pink)" opacity="0.15" />
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
          <div key={i} className="h-[88px] rounded-[14px] bg-[var(--fill-tertiary)] shimmer" />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="rounded-[14px] bg-[var(--fill-tertiary)] overflow-hidden">
        <div className="h-[48px] bg-[var(--fill-secondary)] shimmer" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[52px] border-t border-[var(--fill-quaternary)] shimmer" style={{ animationDelay: `${i * 0.1}s` }} />
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
          className="break-inside-avoid rounded-[14px] bg-[var(--fill-tertiary)] shimmer"
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
        className="w-[56px] h-[56px] rounded-[16px] flex items-center justify-center"
        style={{ background: "rgba(255, 59, 48, 0.12)" }}
      >
        <AlertCircle className="w-7 h-7 text-[var(--ios-red)]" />
      </div>
      <div className="text-center">
        <p className="text-[17px] font-semibold text-[var(--label-primary)] mb-1">
          Something went wrong
        </p>
        <p className="text-[13px] text-[var(--label-secondary)] max-w-[300px]">
          {message}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-[15px] font-medium text-white cursor-pointer transition-all duration-200 hover:opacity-90 active:scale-95"
        style={{
          background: "linear-gradient(135deg, var(--ios-blue), var(--ios-indigo))",
          boxShadow: "0 4px 14px rgba(0, 122, 255, 0.3)",
        }}
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
  const formatCurrency = (v: number) => `₹${v.toLocaleString("en-IN")}`;
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
        <h1 className="text-[34px] font-bold text-[var(--label-primary)] leading-[41px] tracking-[0.37px]">
          Folio
        </h1>
        <p className="text-[15px] text-[var(--label-secondary)] mt-1 leading-[20px]">
          Track expenses and capture quick notes.
        </p>
      </motion.div>

      {/* ── Pill Tab Switcher ── */}
      <motion.div variants={staggerItem} className="flex justify-center">
        <div
          className="inline-flex rounded-[12px] p-[3px] gap-[2px]"
          style={{
            background: "var(--fill-tertiary)",
            border: "1px solid var(--border-card)",
          }}
        >
          {(["expenses", "notes"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative px-6 py-2 rounded-[10px] text-[15px] font-semibold transition-all duration-300 cursor-pointer",
                  isActive
                    ? "text-white shadow-[0_2px_10px_rgba(0,122,255,0.35)]"
                    : "text-[var(--label-secondary)] hover:text-[var(--label-primary)] hover:bg-[var(--fill-quaternary)]"
                )}
                style={
                  isActive
                    ? {
                        background:
                          "linear-gradient(135deg, var(--ios-blue), var(--ios-indigo))",
                      }
                    : undefined
                }
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
                      color: "var(--ios-blue)",
                      bg: "rgba(0, 122, 255, 0.10)",
                      glow: "rgba(0, 122, 255, 0.15)",
                    },
                    {
                      label: "This Month",
                      value: formatCurrency(expenseStats.thisMonth),
                      icon: Calendar,
                      color: "var(--ios-green)",
                      bg: "rgba(52, 199, 89, 0.10)",
                      glow: "rgba(52, 199, 89, 0.15)",
                    },
                    {
                      label: "Top Category",
                      value: expenseStats.topCategory,
                      icon: Tag,
                      color: "var(--ios-purple)",
                      bg: "rgba(175, 82, 222, 0.10)",
                      glow: "rgba(175, 82, 222, 0.15)",
                    },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="relative overflow-hidden rounded-[14px] p-4"
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-card)",
                        boxShadow: `var(--shadow-card), 0 0 0 1px ${stat.glow}`,
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
                          <p className="text-[12px] font-medium text-[var(--label-tertiary)] uppercase tracking-wider">
                            {stat.label}
                          </p>
                          <p className="text-[20px] font-bold text-[var(--label-primary)] truncate leading-tight mt-0.5">
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
                    className="flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-[15px] font-semibold text-white cursor-pointer transition-all duration-200 hover:opacity-90 active:scale-[0.97]"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--ios-blue), var(--ios-indigo))",
                      boxShadow:
                        "0 4px 14px rgba(0, 122, 255, 0.30), 0 0 0 1px rgba(255,255,255,0.08)",
                    }}
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
                    <p className="text-[17px] font-semibold text-[var(--label-primary)]">
                      No expenses yet
                    </p>
                    <p className="text-[13px] text-[var(--label-secondary)]">
                      Tap &ldquo;Add Expense&rdquo; to start tracking your spending.
                    </p>
                  </motion.div>
                ) : (
                  <div
                    className="rounded-[14px] overflow-hidden"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-card)",
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    {/* Desktop Table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr
                            style={{
                              background: "var(--fill-quaternary)",
                              borderBottom: "1px solid var(--border-card)",
                            }}
                          >
                            {["Date", "Category", "Amount", "Description", ""].map(
                              (h) => (
                                <th
                                  key={h}
                                  className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--label-tertiary)]"
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
                              className="group transition-colors hover:bg-[var(--fill-quaternary)]"
                              style={{
                                borderBottom:
                                  idx < expenses.length - 1
                                    ? "1px solid var(--border-card)"
                                    : undefined,
                              }}
                            >
                              <td className="px-4 py-3 text-[14px] text-[var(--label-primary)] font-medium whitespace-nowrap">
                                {formatDate(exp.date)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold"
                                  style={{
                                    color: CATEGORY_COLORS[exp.category] || "var(--ios-gray)",
                                    background: CATEGORY_BG[exp.category] || "var(--fill-quaternary)",
                                  }}
                                >
                                  {exp.category}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[15px] font-bold text-[var(--label-primary)] tabular-nums">
                                {formatCurrency(exp.amount)}
                              </td>
                              <td className="px-4 py-3 text-[14px] text-[var(--label-secondary)] max-w-[200px] truncate">
                                {exp.description || "—"}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => openEditExpense(exp)}
                                    className="p-1.5 rounded-[8px] text-[var(--label-tertiary)] hover:text-[var(--ios-blue)] hover:bg-[rgba(0,122,255,0.1)] transition-all cursor-pointer"
                                    title="Edit"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteExpense(exp.id)}
                                    disabled={deletingExpenseId === exp.id}
                                    className="p-1.5 rounded-[8px] text-[var(--label-tertiary)] hover:text-[var(--ios-red)] hover:bg-[rgba(255,59,48,0.1)] transition-all cursor-pointer disabled:opacity-50"
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
                              background: "var(--fill-quaternary)",
                              borderTop: "2px solid var(--border-card)",
                            }}
                          >
                            <td className="px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-[var(--label-tertiary)]">
                              Total
                            </td>
                            <td />
                            <td className="px-4 py-3 text-[16px] font-bold text-[var(--ios-blue)] tabular-nums">
                              {formatCurrency(expenseStats.total)}
                            </td>
                            <td />
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Mobile Card List */}
                    <div className="sm:hidden divide-y divide-[var(--border-card)]">
                      {expenses.map((exp) => (
                        <div key={exp.id} className="p-4 flex items-center gap-3">
                          <div
                            className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center flex-shrink-0"
                            style={{
                              background: CATEGORY_BG[exp.category] || "var(--fill-quaternary)",
                            }}
                          >
                            <Tag
                              className="w-5 h-5"
                              style={{
                                color: CATEGORY_COLORS[exp.category] || "var(--ios-gray)",
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-[15px] font-semibold text-[var(--label-primary)]">
                                {formatCurrency(exp.amount)}
                              </p>
                              <span
                                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                                style={{
                                  color:
                                    CATEGORY_COLORS[exp.category] || "var(--ios-gray)",
                                  background:
                                    CATEGORY_BG[exp.category] || "var(--fill-quaternary)",
                                }}
                              >
                                {exp.category}
                              </span>
                            </div>
                            <p className="text-[13px] text-[var(--label-secondary)] truncate">
                              {exp.description || "—"}
                            </p>
                            <p className="text-[11px] text-[var(--label-tertiary)] mt-0.5">
                              {formatDate(exp.date)}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 rounded-[8px] text-[var(--label-tertiary)] hover:bg-[var(--fill-quaternary)] cursor-pointer">
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
                                className="rounded-[8px] gap-2 cursor-pointer text-[var(--ios-red)] focus:text-[var(--ios-red)]"
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
                        style={{ background: "var(--fill-quaternary)" }}
                      >
                        <span className="text-[13px] font-bold uppercase tracking-wider text-[var(--label-tertiary)]">
                          Total
                        </span>
                        <span className="text-[17px] font-bold text-[var(--ios-blue)] tabular-nums">
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
                <p className="text-[17px] font-semibold text-[var(--label-primary)]">
                  No notes yet
                </p>
                <p className="text-[13px] text-[var(--label-secondary)]">
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
                      className="rounded-[14px] overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1"
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-card)",
                        boxShadow: "var(--shadow-card)",
                        borderLeft: `4px solid ${note.color}`,
                      }}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-[15px] font-semibold text-[var(--label-primary)] leading-tight line-clamp-2">
                            {note.title || "Untitled"}
                          </h3>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded-[6px] text-[var(--label-quaternary)] opacity-0 group-hover:opacity-100 hover:text-[var(--label-secondary)] hover:bg-[var(--fill-quaternary)] transition-all cursor-pointer flex-shrink-0">
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
                                className="rounded-[8px] gap-2 cursor-pointer text-[var(--ios-red)] focus:text-[var(--ios-red)]"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {note.body && (
                          <p
                            className="text-[13px] text-[var(--label-secondary)] leading-[18px] mb-3"
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
                        <p className="text-[11px] text-[var(--label-quaternary)] font-medium">
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
                background: "linear-gradient(135deg, var(--ios-blue), var(--ios-indigo))",
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
        <DialogContent className="sm:max-w-[480px] rounded-[20px] p-0 gap-0 overflow-hidden border-[var(--border-card)] bg-[var(--bg-card)]">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-[20px] font-bold text-[var(--label-primary)]">
              {editingExpense ? "Edit Expense" : "Add Expense"}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-4">
            {/* Date */}
            <div>
              <label className="block text-[13px] font-medium text-[var(--label-secondary)] mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={expenseForm.date}
                onChange={(e) =>
                  setExpenseForm((p) => ({ ...p, date: e.target.value }))
                }
                className="w-full h-[44px] px-4 rounded-[10px] text-[15px] text-[var(--label-primary)] transition-all duration-200 outline-none"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-input)",
                }}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[13px] font-medium text-[var(--label-secondary)] mb-1.5">
                Category
              </label>
              <select
                value={expenseForm.category}
                onChange={(e) =>
                  setExpenseForm((p) => ({ ...p, category: e.target.value }))
                }
                className="w-full h-[44px] px-4 rounded-[10px] text-[15px] text-[var(--label-primary)] transition-all duration-200 outline-none appearance-none cursor-pointer"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-input)",
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-[13px] font-medium text-[var(--label-secondary)] mb-1.5">
                Amount (₹)
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
                className="w-full h-[44px] px-4 rounded-[10px] text-[15px] text-[var(--label-primary)] transition-all duration-200 outline-none placeholder:text-[var(--label-quaternary)]"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-input)",
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[13px] font-medium text-[var(--label-secondary)] mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="What was this for?"
                className="w-full h-[44px] px-4 rounded-[10px] text-[15px] text-[var(--label-primary)] transition-all duration-200 outline-none placeholder:text-[var(--label-quaternary)]"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-input)",
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <DialogClose asChild>
                <button className="px-5 py-2.5 rounded-[10px] text-[15px] font-medium text-[var(--label-secondary)] hover:bg-[var(--fill-quaternary)] transition-all cursor-pointer">
                  Cancel
                </button>
              </DialogClose>
              <button
                onClick={handleSaveExpense}
                disabled={savingExpense || !expenseForm.amount || Number(expenseForm.amount) <= 0}
                className="px-5 py-2.5 rounded-[10px] text-[15px] font-semibold text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
                style={{
                  background:
                    "linear-gradient(135deg, var(--ios-blue), var(--ios-indigo))",
                  boxShadow: "0 4px 14px rgba(0, 122, 255, 0.3)",
                }}
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
        <DialogContent className="sm:max-w-[520px] rounded-[20px] p-0 gap-0 overflow-hidden border-[var(--border-card)] bg-[var(--bg-card)]">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-[20px] font-bold text-[var(--label-primary)]">
              {editingNote ? "Edit Note" : "New Note"}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-[13px] font-medium text-[var(--label-secondary)] mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={noteForm.title}
                onChange={(e) =>
                  setNoteForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Quick title…"
                className="w-full h-[44px] px-4 rounded-[10px] text-[15px] text-[var(--label-primary)] transition-all duration-200 outline-none placeholder:text-[var(--label-quaternary)]"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-input)",
                }}
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-[13px] font-medium text-[var(--label-secondary)] mb-1.5">
                Note
              </label>
              <textarea
                value={noteForm.body}
                onChange={(e) =>
                  setNoteForm((p) => ({ ...p, body: e.target.value }))
                }
                placeholder="Write your note here…"
                rows={6}
                className="w-full px-4 py-3 rounded-[10px] text-[15px] text-[var(--label-primary)] leading-[22px] transition-all duration-200 outline-none resize-none placeholder:text-[var(--label-quaternary)]"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-input)",
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <DialogClose asChild>
                <button className="px-5 py-2.5 rounded-[10px] text-[15px] font-medium text-[var(--label-secondary)] hover:bg-[var(--fill-quaternary)] transition-all cursor-pointer">
                  Cancel
                </button>
              </DialogClose>
              <button
                onClick={handleSaveNote}
                disabled={
                  savingNote ||
                  (!noteForm.title.trim() && !noteForm.body.trim())
                }
                className="px-5 py-2.5 rounded-[10px] text-[15px] font-semibold text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
                style={{
                  background:
                    "linear-gradient(135deg, var(--ios-blue), var(--ios-indigo))",
                  boxShadow: "0 4px 14px rgba(0, 122, 255, 0.3)",
                }}
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
