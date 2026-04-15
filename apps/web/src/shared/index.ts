// ─── Shared Library Barrel Export ──────────────────────────────
// Import from "@/shared" instead of individual paths

// Errors
export {
    AppError,
    ValidationError,
    NotFoundError,
    AlreadyExistsError,
    AuthenticationError,
    AuthorizationError,
    RateLimitError,
    BusinessRuleError,
    InsufficientStockError,
    InvalidStateTransitionError,
    ConflictError,
    DatabaseError,
    ExternalServiceError,
    ConfigurationError,
    ErrorCode,
    isAppError,
    isOperationalError,
    type ErrorCodeType,
    type FieldError,
} from "./lib/errors";

// Result
export { Result } from "./lib/result";

// API Envelope
export {
    envelope,
    type ApiResponse,
    type ApiSuccessResponse,
    type ApiErrorResponse,
    type ApiMeta,
    type PaginationMeta,
} from "./types/api";

// Config
export { env, isProduction, isDevelopment, isTest } from "./config/env";

// Logger
export {
    logger,
    authLogger,
    inventoryLogger,
    ordersLogger,
    billingLogger,
    productionLogger,
    apiLogger,
    type LogLevel,
} from "./lib/logger";

// Sanitization
export {
    sanitizeMongoInput,
    sanitizeRequestBody,
    sanitizeString,
    escapeHtml,
    stripControlChars,
} from "./lib/sanitize";
