import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { withIdempotency } from "@/lib/with-idempotency";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { logDataOperation, getClientIp } from "@/lib/audit";
import { AppError } from "@/shared/lib/errors";
import { ZodError } from "zod";
import {
  getBankingService,
  getBankingTenantUserId,
  MAX_MULTIPART_BYTES,
} from "@/modules/banking";
import { ensureBankingIndexes } from "@/lib/migrations/ensureBankingIndexes";

const ALLOWED_ROLES = ["Owner", "Admin", "Accountant"];

export const POST = withRateLimit(
  withIdempotency(
    async (request: NextRequest) => {
      try {
        ensureBankingIndexes().catch(() => {});

        const result = await requireRole(ALLOWED_ROLES);
        if (result.error || !result.user) {
          return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
        }

        const user = result.user;
        const tenantId = getDataOwnerId(user);
        const importedBy = user.fullName || user.email || String(user._id);

        // Enforce payload size limit BEFORE buffering body
        const contentLength = request.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > MAX_MULTIPART_BYTES) {
          return NextResponse.json(
            { error: "Payload exceeds maximum allowed size of 4 MB" },
            { status: 413 }
          );
        }

        let formData: FormData;
        if (!contentLength && request.body) {
          let bytesCount = 0;
          const byteCounter = new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
              bytesCount += chunk.byteLength;
              if (bytesCount > MAX_MULTIPART_BYTES) {
                controller.error(new Error("PAYLOAD_TOO_LARGE"));
                return;
              }
              controller.enqueue(chunk);
            },
          });

          const cappedStream = request.body.pipeThrough(byteCounter);
          const cappedRequest = new Request(request.url, {
            method: request.method,
            headers: request.headers,
            body: cappedStream,
            // @ts-expect-error duplex is required in Node fetch when body is a stream
            duplex: "half",
          });

          try {
            formData = await cappedRequest.formData();
          } catch (err: unknown) {
            const errStr = String(err);
            const errObj = (typeof err === "object" && err !== null) ? (err as { message?: string; cause?: { message?: string } }) : null;
            if (
              errObj?.message === "PAYLOAD_TOO_LARGE" ||
              errObj?.cause?.message === "PAYLOAD_TOO_LARGE" ||
              errStr.includes("PAYLOAD_TOO_LARGE")
            ) {
              return NextResponse.json(
                { error: "Payload exceeds maximum allowed size of 4 MB" },
                { status: 413 }
              );
            }
            throw err;
          }
        } else {
          formData = await request.formData();
        }
        const file = formData.get("file") as File | null;
        const bankAccountId = formData.get("bank_account_id") as string | null;
        const rawMapping = formData.get("mapping") as string | null;

        if (!file) {
          return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
        }

        if (!bankAccountId) {
          return NextResponse.json({ error: "bank_account_id is required" }, { status: 400 });
        }

        if (!rawMapping) {
          return NextResponse.json({ error: "mapping configuration is required" }, { status: 400 });
        }

        let mappingInput;
        try {
          mappingInput = typeof rawMapping === "string" ? JSON.parse(rawMapping) : rawMapping;
        } catch {
          return NextResponse.json({ error: "Invalid mapping JSON format" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const service = getBankingService();
        const importDoc = await service.commitImport(
          tenantId,
          importedBy,
          bankAccountId,
          buffer,
          file.name,
          mappingInput
        );

        // Audit log
        await logDataOperation({
          organizationId: tenantId,
          userId: String(user._id),
          userName: user.fullName || user.email || "Unknown User",
          userRole: (user.role === "Admin" || user.role === "Owner") ? "Admin" : "Staff",
            userRoleDetail: user.role || user.role,
          action: `Committed bank statement import ${importDoc.file_name} (${importDoc.rows_inserted} inserted, ${importDoc.rows_skipped_duplicate} skipped)`,
          actionType: "create",
          module: "banking",
          resourceId: importDoc.id,
          resourceType: "bank_statement_import",
          afterState: importDoc as unknown as Record<string, unknown>,
          ipAddress: getClientIp(request),
          userAgent: request.headers.get("user-agent") || undefined,
        });

        return NextResponse.json(importDoc, { status: 201 });
      } catch (error: unknown) {
        if (error instanceof ZodError) {
          return NextResponse.json(
            { error: error.issues?.[0]?.message || "Validation failed", details: error.issues },
            { status: 400 }
          );
        }
        if (error instanceof AppError) {
          return NextResponse.json(
            { error: error.message, code: error.code, details: error.details },
            { status: error.statusCode }
          );
        }
        console.error("Error committing statement import:", error);
        return NextResponse.json({ error: "Failed to commit statement import" }, { status: 500 });
      }
    },
    {
      getUserId: getBankingTenantUserId,
    }
  ),
  { tier: "expensive" }
);
