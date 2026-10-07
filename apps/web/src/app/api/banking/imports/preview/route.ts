import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { withRateLimit } from "@/shared/middleware/rate-limiter";
import { AppError } from "@/shared/lib/errors";
import { ZodError } from "zod";
import { getBankingService } from "@/modules/banking";

const ALLOWED_ROLES = ["Owner", "Admin", "Accountant"];

export const POST = withRateLimit(
  async (request: NextRequest) => {
    try {
      const result = await requireRole(ALLOWED_ROLES);
      if (result.error || !result.user) {
        return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
      }

      const tenantId = getDataOwnerId(result.user);

      // Enforce payload size limit BEFORE buffering body
      const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB file
      const MULTIPART_OVERHEAD = 256 * 1024; // 256 KB allowance for multipart headers/boundaries
      const MAX_MULTIPART_BYTES = MAX_FILE_BYTES + MULTIPART_OVERHEAD; // 5,505,024 bytes (5.25 MB)
      const contentLength = request.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > MAX_MULTIPART_BYTES) {
        return NextResponse.json(
          { error: "Payload exceeds maximum allowed size of 5 MB" },
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
        } catch (err: any) {
          if (
            err?.message === "PAYLOAD_TOO_LARGE" ||
            err?.cause?.message === "PAYLOAD_TOO_LARGE" ||
            String(err).includes("PAYLOAD_TOO_LARGE")
          ) {
            return NextResponse.json(
              { error: "Payload exceeds maximum allowed size of 5 MB" },
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

      let mappingOverride = null;
      if (rawMapping) {
        try {
          mappingOverride = JSON.parse(rawMapping);
        } catch {
          return NextResponse.json({ error: "Invalid mapping JSON" }, { status: 400 });
        }
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const service = getBankingService();
      const preview = await service.previewImport(
        tenantId,
        bankAccountId,
        buffer,
        file.name,
        mappingOverride
      );

      return NextResponse.json(preview);
    } catch (error: any) {
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
      console.error("Error generating import preview:", error);
      return NextResponse.json({ error: "Failed to generate import preview" }, { status: 500 });
    }
  },
  { tier: "expensive" }
);
