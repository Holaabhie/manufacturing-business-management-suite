import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useURLSyncedPagination } from "@/hooks/useURLSyncedPagination";

export function useOrderFilters() {
  const searchParams = useSearchParams();
  const { initialPage, initialSearch, initialLimit, syncToURL } =
    useURLSyncedPagination({ debounceMs: 300 });

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialLimit);
  const [searchQuery, setSearchQuery] = useState(
    initialSearch || searchParams.get("search") || ""
  );
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  const [statusFilter, setStatusFilter] = useState<string | null>(
    () => searchParams.get("status")
  );

  // 300ms search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleSearch = useCallback((val: string) => {
    setSearchQuery(val);
  }, []);

  const handleStatusFilter = useCallback((status: string | null) => {
    setStatusFilter(!status || status === "all" || status === "ALL" ? null : status);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // Sync state to URL query parameters
  useEffect(() => {
    syncToURL({
      page: currentPage,
      limit: pageSize,
      q: debouncedQuery,
      filters: {
        status: statusFilter && statusFilter !== "ALL" ? statusFilter : null,
      },
    });
  }, [currentPage, pageSize, debouncedQuery, statusFilter, syncToURL]);

  return {
    currentPage,
    pageSize,
    searchQuery,
    debouncedQuery,
    statusFilter,
    handleSearch,
    handleStatusFilter,
    handlePageChange,
    handlePageSizeChange,
    setSearchQuery,
  };
}
