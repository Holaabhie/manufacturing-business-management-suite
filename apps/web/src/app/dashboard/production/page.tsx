"use client";

import { useState } from "react";
import {
    Package,
    Play,
    Scale,
    Hash,
    FileText,
    Save,
    Plus,
    ChevronRight,
    Boxes,
    Activity,
    Clock,
    CheckCircle2,
    AlertTriangle,
    TrendingUp,
    ToggleLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

// ─── Mock Data ──────────────────────────────────────────────────
const mockMaterials = [
    {
        id: "mat-001",
        name: "LV Plastic Bag",
        units: 20000,
        unit: "units",
        available: true,
        category: "Packaging",
    },
    {
        id: "mat-002",
        name: "Protein Powder",
        units: 5000,
        unit: "kg",
        available: true,
        category: "Raw Material",
    },
    {
        id: "mat-003",
        name: "Seal Labels",
        units: 15000,
        unit: "units",
        available: false,
        category: "Packaging",
    },
    {
        id: "mat-004",
        name: "Flavoring Agent",
        units: 800,
        unit: "liters",
        available: true,
        category: "Additive",
    },
];

const productionStats = [
    {
        label: "Active Batches",
        value: "12",
        change: "+3 today",
        icon: Activity,
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
    },
    {
        label: "Completed Today",
        value: "8",
        change: "95% yield",
        icon: CheckCircle2,
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
    },
    {
        label: "Pending QC",
        value: "3",
        change: "Avg 2.1h",
        icon: Clock,
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
    },
    {
        label: "Efficiency Rate",
        value: "94.2%",
        change: "+1.8%",
        icon: TrendingUp,
        color: "text-violet-400",
        bgColor: "bg-violet-500/10",
        borderColor: "border-violet-500/20",
    },
];

// ─── Animation Variants ─────────────────────────────────────────
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
    },
};

// ─── Page Component ─────────────────────────────────────────────
export default function ProductionPage() {
    const [materials, setMaterials] = useState(mockMaterials);
    const [weightValue, setWeightValue] = useState("250");
    const [weightUnit, setWeightUnit] = useState<"KG" | "g">("KG");
    const [batchNumber, setBatchNumber] = useState("BN-2026-0042");
    const [notes, setNotes] = useState("");
    const [isStarting, setIsStarting] = useState(false);

    const toggleAvailability = (id: string) => {
        setMaterials((prev) =>
            prev.map((m) => (m.id === id ? { ...m, available: !m.available } : m))
        );
    };

    const handleStartProduction = () => {
        setIsStarting(true);
        setTimeout(() => {
            setIsStarting(false);
            toast.success("Production order initiated successfully", {
                description: `Batch ${batchNumber} is now in production.`,
            });
        }, 1500);
    };

    const handleSaveDetails = () => {
        toast.success("Production details saved", {
            description: "All changes have been recorded.",
        });
    };

    return (
        <motion.div
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* ─── Page Header ─────────────────────────────────────────── */}
            <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <span>Dashboard</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                        <span className="text-foreground font-medium">Production</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Production Management
                    </h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <Boxes className="h-4 w-4 text-indigo-400" />
                        Manage production tasks, batches, and output tracking
                    </p>
                </div>
                <Button
                    size="lg"
                    className="rounded-xl shadow-xl shadow-indigo-500/20 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={handleStartProduction}
                    disabled={isStarting}
                >
                    <Plus className="h-5 w-5" />
                    Create new production task
                </Button>
            </motion.div>

            {/* ─── Stats Row ───────────────────────────────────────────── */}
            <motion.div
                variants={itemVariants}
                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
                {productionStats.map((stat) => (
                    <div
                        key={stat.label}
                        className={cn(
                            "relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02]",
                            "bg-card dark:bg-slate-900 border-border dark:border-slate-800"
                        )}
                    >
                        <div className="flex items-start justify-between">
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {stat.label}
                                </p>
                                <p className="text-2xl font-black tracking-tight">
                                    {stat.value}
                                </p>
                                <p className={cn("text-xs font-medium", stat.color)}>
                                    {stat.change}
                                </p>
                            </div>
                            <div
                                className={cn(
                                    "rounded-lg p-2.5 border",
                                    stat.bgColor,
                                    stat.borderColor
                                )}
                            >
                                <stat.icon className={cn("h-5 w-5", stat.color)} />
                            </div>
                        </div>
                        {/* Decorative gradient */}
                        <div
                            className={cn(
                                "absolute -bottom-2 -right-2 w-20 h-20 rounded-full opacity-5 blur-2xl",
                                stat.bgColor
                            )}
                        />
                    </div>
                ))}
            </motion.div>

            {/* ─── Production Grid ─────────────────────────────────────── */}
            <motion.div variants={itemVariants}>
                <div className="flex items-center gap-3 mb-5">
                    <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2">
                        <Boxes className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">
                            Production Management
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            Configure and manage active production parameters
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {/* ── Card 1: Material Inventory ──────────────────────────── */}
                    <motion.div
                        variants={itemVariants}
                        className={cn(
                            "col-span-1 md:col-span-2 xl:col-span-1 rounded-xl border overflow-hidden",
                            "bg-card dark:bg-slate-900 border-border dark:border-slate-800"
                        )}
                    >
                        <div className="p-5 border-b border-border dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2">
                                        <Package className="h-4 w-4 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Material Inventory</h3>
                                        <p className="text-xs text-muted-foreground">
                                            {materials.filter((m) => m.available).length} of{" "}
                                            {materials.length} available
                                        </p>
                                    </div>
                                </div>
                                <Badge
                                    variant="outline"
                                    className="text-[10px] uppercase font-bold tracking-wider border-emerald-500/30 text-emerald-500"
                                >
                                    Live
                                </Badge>
                            </div>
                        </div>
                        <div className="divide-y divide-border dark:divide-slate-800">
                            {materials.map((material) => (
                                <div
                                    key={material.id}
                                    className={cn(
                                        "flex items-center justify-between p-4 transition-colors",
                                        "hover:bg-muted/50 dark:hover:bg-slate-800/50"
                                    )}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className={cn(
                                                "w-2 h-2 rounded-full flex-shrink-0",
                                                material.available ? "bg-emerald-400" : "bg-slate-500"
                                            )}
                                        />
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold truncate">
                                                {material.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-muted-foreground">
                                                    {material.units.toLocaleString()} {material.unit}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="text-[9px] h-4 px-1.5 font-bold uppercase"
                                                >
                                                    {material.category}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span
                                            className={cn(
                                                "text-[10px] font-bold uppercase tracking-wider",
                                                material.available
                                                    ? "text-emerald-400"
                                                    : "text-muted-foreground"
                                            )}
                                        >
                                            {material.available ? "Available" : "Unavailable"}
                                        </span>
                                        <Switch
                                            checked={material.available}
                                            onCheckedChange={() => toggleAvailability(material.id)}
                                            className="data-[state=checked]:bg-emerald-500"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* ── Card 2: Production Order ────────────────────────────── */}
                    <motion.div
                        variants={itemVariants}
                        className={cn(
                            "rounded-xl border overflow-hidden flex flex-col",
                            "bg-card dark:bg-slate-900 border-border dark:border-slate-800"
                        )}
                    >
                        <div className="p-5 border-b border-border dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2">
                                    <Play className="h-4 w-4 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Production Order</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Initiate a new production run
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 p-5 flex flex-col">
                            <div className="flex-1 space-y-4">
                                <div className="rounded-xl bg-muted/50 dark:bg-slate-800/50 border border-border dark:border-slate-700 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Activity className="h-4 w-4 text-blue-400" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Current Queue
                                        </span>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">Pending</span>
                                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20">
                                                5 orders
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">In Progress</span>
                                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20">
                                                3 orders
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">QC Review</span>
                                            <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20">
                                                2 orders
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-dashed border-border dark:border-slate-700 p-4 flex items-center gap-3">
                                    <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                                    <p className="text-xs text-muted-foreground">
                                        Ensure all materials are available before starting a
                                        production order.
                                    </p>
                                </div>
                            </div>
                            <Button
                                className="w-full mt-5 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm gap-2 shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:shadow-indigo-500/30"
                                onClick={handleStartProduction}
                                disabled={isStarting}
                            >
                                {isStarting ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Initiating...
                                    </>
                                ) : (
                                    <>
                                        <Play className="h-4 w-4" />
                                        Start Production Order
                                    </>
                                )}
                            </Button>
                        </div>
                    </motion.div>

                    {/* ── Card 3: Output Weight ──────────────────────────────── */}
                    <motion.div
                        variants={itemVariants}
                        className={cn(
                            "rounded-xl border overflow-hidden",
                            "bg-card dark:bg-slate-900 border-border dark:border-slate-800"
                        )}
                    >
                        <div className="p-5 border-b border-border dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-2">
                                    <Scale className="h-4 w-4 text-orange-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Output Weight</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Record production output weight
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-5 space-y-5">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Weight Value
                                </Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={weightValue}
                                        onChange={(e) => setWeightValue(e.target.value)}
                                        className="h-14 text-3xl font-black text-center bg-muted/50 dark:bg-slate-800/50 border-border dark:border-slate-700 rounded-xl pr-16"
                                        placeholder="0"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                                        {weightUnit}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Unit Toggle
                                </Label>
                                <div className="flex rounded-xl overflow-hidden border border-border dark:border-slate-700">
                                    <button
                                        className={cn(
                                            "flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-all duration-200",
                                            weightUnit === "KG"
                                                ? "bg-indigo-600 text-white shadow-lg"
                                                : "bg-muted/50 dark:bg-slate-800/50 text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-slate-800"
                                        )}
                                        onClick={() => setWeightUnit("KG")}
                                    >
                                        KG
                                    </button>
                                    <button
                                        className={cn(
                                            "flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-all duration-200",
                                            weightUnit === "g"
                                                ? "bg-indigo-600 text-white shadow-lg"
                                                : "bg-muted/50 dark:bg-slate-800/50 text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-slate-800"
                                        )}
                                        onClick={() => setWeightUnit("g")}
                                    >
                                        g
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-xl bg-muted/50 dark:bg-slate-800/50 border border-border dark:border-slate-700 p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground font-medium">
                                        Converted
                                    </span>
                                    <span className="text-sm font-bold">
                                        {weightUnit === "KG"
                                            ? `${(parseFloat(weightValue || "0") * 1000).toLocaleString()} g`
                                            : `${(parseFloat(weightValue || "0") / 1000).toFixed(2)} KG`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Card 4: Batch Number ───────────────────────────────── */}
                    <motion.div
                        variants={itemVariants}
                        className={cn(
                            "rounded-xl border overflow-hidden",
                            "bg-card dark:bg-slate-900 border-border dark:border-slate-800"
                        )}
                    >
                        <div className="p-5 border-b border-border dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-2">
                                    <Hash className="h-4 w-4 text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Batch Number</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Assign a job/batch number
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-5 space-y-5">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Job Number
                                </Label>
                                <Input
                                    value={batchNumber}
                                    onChange={(e) => setBatchNumber(e.target.value)}
                                    className="h-12 text-lg font-bold font-mono bg-muted/50 dark:bg-slate-800/50 border-border dark:border-slate-700 rounded-xl tracking-wider"
                                    placeholder="BN-YYYY-XXXX"
                                />
                            </div>

                            <div className="space-y-3">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Recent Batches
                                </Label>
                                <div className="space-y-2">
                                    {[
                                        {
                                            id: "BN-2026-0041",
                                            status: "Completed",
                                            color: "text-emerald-400",
                                        },
                                        {
                                            id: "BN-2026-0040",
                                            status: "Completed",
                                            color: "text-emerald-400",
                                        },
                                        {
                                            id: "BN-2026-0039",
                                            status: "QC Review",
                                            color: "text-amber-400",
                                        },
                                    ].map((batch) => (
                                        <div
                                            key={batch.id}
                                            className="flex items-center justify-between rounded-lg bg-muted/50 dark:bg-slate-800/50 border border-border dark:border-slate-700 px-3 py-2.5 cursor-pointer hover:bg-muted dark:hover:bg-slate-800 transition-colors"
                                            onClick={() => setBatchNumber(batch.id)}
                                        >
                                            <span className="text-sm font-mono font-bold">
                                                {batch.id}
                                            </span>
                                            <span
                                                className={cn(
                                                    "text-[10px] font-bold uppercase tracking-wider",
                                                    batch.color
                                                )}
                                            >
                                                {batch.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Card 5: Notes & Save (Footer) ─────────────────────── */}
                    <motion.div
                        variants={itemVariants}
                        className={cn(
                            "col-span-1 md:col-span-2 xl:col-span-1 rounded-xl border overflow-hidden flex flex-col",
                            "bg-card dark:bg-slate-900 border-border dark:border-slate-800"
                        )}
                    >
                        <div className="p-5 border-b border-border dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-pink-500/10 border border-pink-500/20 p-2">
                                    <FileText className="h-4 w-4 text-pink-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Production Notes</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Add remarks or special instructions
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 p-5 flex flex-col">
                            <div className="flex-1 space-y-3">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Notes
                                </Label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Enter production notes, special instructions, or quality requirements..."
                                    rows={5}
                                    className={cn(
                                        "flex w-full rounded-xl border px-4 py-3 text-sm shadow-xs transition-colors resize-none",
                                        "bg-muted/50 dark:bg-slate-800/50 border-border dark:border-slate-700",
                                        "placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50",
                                        "disabled:cursor-not-allowed disabled:opacity-50"
                                    )}
                                />
                            </div>

                            <div className="mt-5 space-y-3">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Last saved: Today at 3:42 PM</span>
                                </div>
                                <Button
                                    className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm gap-2 shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:shadow-indigo-500/30"
                                    onClick={handleSaveDetails}
                                >
                                    <Save className="h-4 w-4" />
                                    Save Production Details
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </motion.div>
    );
}
