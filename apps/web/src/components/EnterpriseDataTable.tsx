"use client";

import * as React from "react";
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    Row,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Search,
    SlidersHorizontal,
    Download,
    FileSpreadsheet,
    FileText,
    MoreHorizontal,
    Columns3,
    Filter,
    X,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface EnterpriseDataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    searchColumn?: string;
    searchPlaceholder?: string;
    isLoading?: boolean;
    onRowSelect?: (rows: TData[]) => void;
    onExportPDF?: () => void;
    onExportExcel?: () => void;
    onExportCSV?: () => void;
    emptyStateTitle?: string;
    emptyStateDescription?: string;
    emptyStateAction?: {
        label: string;
        onClick: () => void;
    };
    showBulkActions?: boolean;
    bulkActions?: Array<{
        label: string;
        icon?: React.ReactNode;
        onClick: (rows: TData[]) => void;
        variant?: "default" | "destructive";
    }>;
}

export function EnterpriseDataTable<TData, TValue>({
    columns,
    data,
    searchColumn,
    searchPlaceholder = "Search...",
    isLoading = false,
    onRowSelect,
    onExportPDF,
    onExportExcel,
    onExportCSV,
    emptyStateTitle = "No data found",
    emptyStateDescription = "There are no records to display.",
    emptyStateAction,
    showBulkActions = true,
    bulkActions = [],
}: EnterpriseDataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [globalFilter, setGlobalFilter] = React.useState("");

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
    });

    // Notify parent of row selection changes
    React.useEffect(() => {
        if (onRowSelect) {
            const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original);
            onRowSelect(selectedRows);
        }
    }, [rowSelection, onRowSelect, table]);

    const selectedRowCount = Object.keys(rowSelection).length;

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Search */}
                <div className="relative w-full md:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={searchPlaceholder}
                        value={globalFilter ?? ""}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className="pl-9 h-10 bg-muted/50"
                    />
                    {globalFilter && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setGlobalFilter("")}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Column visibility */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-2">
                                <Columns3 className="h-4 w-4" />
                                <span className="hidden sm:inline">Columns</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    );
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Export */}
                    {(onExportPDF || onExportExcel || onExportCSV) && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 gap-2">
                                    <Download className="h-4 w-4" />
                                    <span className="hidden sm:inline">Export</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Export data</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {onExportExcel && (
                                    <DropdownMenuCheckboxItem onClick={onExportExcel}>
                                        <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
                                        Excel (.xlsx)
                                    </DropdownMenuCheckboxItem>
                                )}
                                {onExportCSV && (
                                    <DropdownMenuCheckboxItem onClick={onExportCSV}>
                                        <FileText className="h-4 w-4 mr-2 text-blue-600" />
                                        CSV
                                    </DropdownMenuCheckboxItem>
                                )}
                                {onExportPDF && (
                                    <DropdownMenuCheckboxItem onClick={onExportPDF}>
                                        <FileText className="h-4 w-4 mr-2 text-red-600" />
                                        PDF
                                    </DropdownMenuCheckboxItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {/* Bulk Actions Bar */}
            <AnimatePresence>
                {showBulkActions && selectedRowCount > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg"
                    >
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-medium">
                                {selectedRowCount} selected
                            </Badge>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setRowSelection({})}
                            >
                                Clear selection
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            {bulkActions.map((action, idx) => (
                                <Button
                                    key={idx}
                                    variant={action.variant === "destructive" ? "destructive" : "outline"}
                                    size="sm"
                                    className="h-8 gap-2"
                                    onClick={() => {
                                        const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original);
                                        action.onClick(selectedRows);
                                    }}
                                >
                                    {action.icon}
                                    {action.label}
                                </Button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Table */}
            <div className="rounded-xl border overflow-hidden bg-card">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
                                {headerGroup.headers.map((header) => {
                                    const isSortable = header.column.getCanSort();
                                    const sortDirection = header.column.getIsSorted();

                                    return (
                                        <TableHead
                                            key={header.id}
                                            className={cn(
                                                "text-xs font-semibold",
                                                isSortable && "cursor-pointer select-none hover:bg-muted"
                                            )}
                                            onClick={isSortable ? header.column.getToggleSortingHandler() : undefined}
                                        >
                                            <div className="flex items-center gap-1">
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                {isSortable && (
                                                    <span className="ml-1">
                                                        {sortDirection === "asc" ? (
                                                            <ArrowUp className="h-3 w-3" />
                                                        ) : sortDirection === "desc" ? (
                                                            <ArrowDown className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            // Loading state
                            Array.from({ length: 5 }).map((_, idx) => (
                                <TableRow key={idx}>
                                    {columns.map((_, colIdx) => (
                                        <TableCell key={colIdx}>
                                            <div className="h-4 bg-muted rounded shimmer" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row, idx) => (
                                <motion.tr
                                    key={row.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: idx * 0.02 }}
                                    className={cn(
                                        "border-b transition-colors hover:bg-muted/50",
                                        row.getIsSelected() && "bg-primary/5"
                                    )}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="text-sm">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </motion.tr>
                            ))
                        ) : (
                            // Empty state
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-48">
                                    <div className="flex flex-col items-center justify-center text-center py-8">
                                        <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4">
                                            <Search className="h-8 w-8 text-muted-foreground/50" />
                                        </div>
                                        <h3 className="font-semibold text-base mb-1">{emptyStateTitle}</h3>
                                        <p className="text-sm text-muted-foreground max-w-sm mb-4">
                                            {emptyStateDescription}
                                        </p>
                                        {emptyStateAction && (
                                            <Button onClick={emptyStateAction.onClick}>
                                                {emptyStateAction.label}
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Rows per page:</span>
                    <Select
                        value={`${table.getState().pagination.pageSize}`}
                        onValueChange={(value) => {
                            table.setPageSize(Number(value));
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={table.getState().pagination.pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 30, 50, 100].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                    {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                        Page {table.getState().pagination.pageIndex + 1} of{" "}
                        {table.getPageCount() || 1}
                        <span className="hidden sm:inline">
                            {" · "}
                            {table.getFilteredRowModel().rows.length} total rows
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Selection column helper
export function createSelectColumn<TData>(): ColumnDef<TData> {
    return {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
                className="translate-y-[2px]"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                className="translate-y-[2px]"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    };
}

// Actions column helper
export function createActionsColumn<TData>(
    actions: Array<{
        label: string;
        icon?: React.ReactNode;
        onClick: (row: TData) => void;
        variant?: "default" | "destructive";
    }>
): ColumnDef<TData> {
    return {
        id: "actions",
        header: "",
        cell: ({ row }) => (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 data-[state=open]:bg-muted"
                    >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                    {actions.map((action, idx) => (
                        <DropdownMenuCheckboxItem
                            key={idx}
                            onClick={() => action.onClick(row.original)}
                            className={cn(
                                action.variant === "destructive" && "text-destructive focus:text-destructive"
                            )}
                        >
                            {action.icon && <span className="mr-2">{action.icon}</span>}
                            {action.label}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        ),
        enableSorting: false,
        enableHiding: false,
    };
}
