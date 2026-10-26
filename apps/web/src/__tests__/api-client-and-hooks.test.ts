import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient, ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import * as orderHooks from "@/lib/hooks/use-orders";
import * as clientHooks from "@/lib/hooks/use-clients";
import * as inventoryHooks from "@/lib/hooks/use-inventory";

describe("Unified Data Fetching - apiClient & queryKeys", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("queryKeys factory", () => {
    it("generates correct tuples for orders", () => {
      expect(queryKeys.orders).toEqual(["orders"]);
      expect(queryKeys.order("ord-123")).toEqual(["orders", "ord-123"]);
      expect(queryKeys.ordersByClient("cli-456")).toEqual(["orders", "by-client", "cli-456"]);
    });

    it("generates correct tuples for clients", () => {
      expect(queryKeys.clients).toEqual(["clients"]);
      expect(queryKeys.client("cli-123")).toEqual(["clients", "cli-123"]);
      expect(queryKeys.clientProducts("cli-123")).toEqual(["clients", "products", "cli-123"]);
      expect(queryKeys.clientProductMaterials("cli-123", "prod-456")).toEqual([
        "clients",
        "materials",
        "cli-123",
        "prod-456",
      ]);
    });

    it("generates correct tuples for inventory", () => {
      expect(queryKeys.inventory).toEqual(["inventory"]);
      expect(queryKeys.inventoryItem("inv-789")).toEqual(["inventory", "inv-789"]);
      expect(queryKeys.inventoryForecast).toEqual(["inventory", "forecast"]);
    });
  });

  describe("apiClient HTTP client", () => {
    it("successfully performs GET and parses JSON", async () => {
      const mockData = [{ id: "1", name: "Test Item" }];
      globalThis.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockData), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const result = await apiClient.get<typeof mockData>("/api/test");
      expect(result).toEqual(mockData);
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
        method: "GET",
      }));
    });

    it("appends query parameters cleanly", async () => {
      globalThis.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      await apiClient.get("/api/test", {
        params: { status: "active", page: 1, filter: true },
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/test?status=active&page=1&filter=true",
        expect.anything()
      );
    });

    it("serializes JSON body for POST/PUT", async () => {
      const payload = { name: "New Client", email: "client@test.com" };
      globalThis.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ id: "cli-1", ...payload }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const res = await apiClient.post<{ id: string }>("/api/clients", payload);
      expect(res.id).toBe("cli-1");
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/clients", expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }));
    });

    it("throws ApiError with status and message on 400 error", async () => {
      globalThis.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Invalid client name" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      await expect(apiClient.post("/api/clients", {})).rejects.toThrow(ApiError);
      try {
        await apiClient.post("/api/clients", {});
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(400);
        expect(apiErr.message).toBe("Invalid client name");
        expect(apiErr.isClientError).toBe(true);
      }
    });

    it("parses Retry-After header on 429 rate limit", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Too many requests" }), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "45",
          },
        })
      );

      try {
        await apiClient.get("/api/v1/orders");
        expect.unreachable("Should have thrown");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(429);
        expect(apiErr.isRateLimited).toBe(true);
        expect(apiErr.retryAfter).toBe(45);
      }
    });

    it("supports AbortSignal request cancellation", async () => {
      const controller = new AbortController();
      controller.abort();

      globalThis.fetch = vi.fn().mockRejectedValue(new DOMException("The user aborted a request.", "AbortError"));

      await expect(apiClient.get("/api/v1/orders", { signal: controller.signal })).rejects.toThrow(ApiError);
    });

    describe("401 Redirect Safety", () => {
      const originalWindow = globalThis.window;

      beforeEach(() => {
        // Mock window.location
        delete (globalThis as { window?: unknown }).window;
        (globalThis as { window: unknown }).window = {
          location: {
            pathname: "/dashboard/orders",
            href: "http://localhost:3000/dashboard/orders",
          },
        };
      });

      afterEach(() => {
        (globalThis as { window: unknown }).window = originalWindow;
      });

      it("does NOT redirect when endpoint is /api/auth/* and propagates ApiError", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ error: "Invalid credentials" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          })
        );

        await expect(apiClient.post("/api/auth/login", { email: "test@example.com" })).rejects.toThrow(ApiError);
        expect(window.location.href).toBe("http://localhost:3000/dashboard/orders");
      });

      it("does NOT redirect when user is already on a public page (/login, /register, etc.)", async () => {
        window.location.pathname = "/login";
        window.location.href = "http://localhost:3000/login";

        globalThis.fetch = vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          })
        );

        await expect(apiClient.get("/api/v1/profile")).rejects.toThrow(ApiError);
        expect(window.location.href).toBe("http://localhost:3000/login");
      });

      it("does NOT redirect when skipAuthRedirect is true", async () => {
        window.location.pathname = "/dashboard/settings";
        window.location.href = "http://localhost:3000/dashboard/settings";

        globalThis.fetch = vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ error: "Session expired" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          })
        );

        await expect(apiClient.get("/api/v1/notifications", { skipAuthRedirect: true })).rejects.toThrow(ApiError);
        expect(window.location.href).toBe("http://localhost:3000/dashboard/settings");
      });

      it("redirects to /login?redirect=... on protected routes when 401 is received", async () => {
        window.location.pathname = "/dashboard/orders";
        window.location.href = "http://localhost:3000/dashboard/orders";

        globalThis.fetch = vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          })
        );

        await expect(apiClient.get("/api/v1/orders")).rejects.toThrow(ApiError);
        expect(window.location.href).toBe("/login?redirect=%2Fdashboard%2Forders");
      });
    });
  });

  describe("Query Client & Account-Switch Cache Isolation", () => {
    it("clears all queries and caches on clearAppQueryCache for account switch isolation", async () => {
      const { getQueryClient, clearAppQueryCache } = await import("@/lib/query-client");
      const qc = getQueryClient();

      qc.setQueryData(["orders"], [{ id: "order-1", total: 1000 }]);
      qc.setQueryData(["clients"], [{ id: "client-1", name: "Tenant A Client" }]);
      qc.setQueryData(["inventory"], [{ id: "inv-1", name: "Steel Coil" }]);

      expect(qc.getQueryData(["orders"])).toBeDefined();
      expect(qc.getQueryData(["clients"])).toBeDefined();
      expect(qc.getQueryData(["inventory"])).toBeDefined();

      clearAppQueryCache();

      expect(qc.getQueryData(["orders"])).toBeUndefined();
      expect(qc.getQueryData(["clients"])).toBeUndefined();
      expect(qc.getQueryData(["inventory"])).toBeUndefined();
      expect(qc.getQueryCache().getAll().length).toBe(0);
    });
  });

  describe("Hooks Exports Verification", () => {
    it("exports all required Orders hooks", () => {
      expect(orderHooks.useOrders).toBeDefined();
      expect(orderHooks.useOrder).toBeDefined();
      expect(orderHooks.useCreateOrder).toBeDefined();
      expect(orderHooks.useUpdateOrder).toBeDefined();
      expect(orderHooks.useDeleteOrder).toBeDefined();
      expect(orderHooks.useRecordPayment).toBeDefined();
      expect(orderHooks.useUpdateOrderStatus).toBeDefined();
    });

    it("exports all required Clients hooks", () => {
      expect(clientHooks.useClients).toBeDefined();
      expect(clientHooks.useClient).toBeDefined();
      expect(clientHooks.useClientProducts).toBeDefined();
      expect(clientHooks.useClientProductMaterials).toBeDefined();
      expect(clientHooks.useCreateClient).toBeDefined();
      expect(clientHooks.useUpdateClient).toBeDefined();
      expect(clientHooks.useDeleteClient).toBeDefined();
      expect(clientHooks.useAddClientProduct).toBeDefined();
      expect(clientHooks.useDeleteClientProduct).toBeDefined();
      expect(clientHooks.useAddClientMaterial).toBeDefined();
      expect(clientHooks.useDeleteClientMaterial).toBeDefined();
    });

    it("exports all required Inventory hooks", () => {
      expect(inventoryHooks.useInventory).toBeDefined();
      expect(inventoryHooks.useInventoryItem).toBeDefined();
      expect(inventoryHooks.useInventoryForecast).toBeDefined();
      expect(inventoryHooks.useCreateInventoryItem).toBeDefined();
      expect(inventoryHooks.useUpdateInventoryItem).toBeDefined();
      expect(inventoryHooks.useDeleteInventoryItem).toBeDefined();
    });
  });
});
