export type {
    Quotation,
    QuoteStatus,
    QuoteItem,
    QuoteCustomer,
    CreateQuoteDTO,
    UpdateQuoteDTO,
    IQuoteRepository,
} from "./domain/types";
export {
    createQuoteSchema,
    updateQuoteSchema,
    quoteItemSchema,
    quoteCustomerSchema,
    quoteStatusTransitionSchema,
    type CreateQuoteInput,
    type UpdateQuoteInput,
} from "./domain/schemas";
export { QuoteService } from "./application/quote.service";
export { MongoQuoteRepository, getQuoteRepository } from "./infrastructure/quote.repository";
export {
    generateSequentialQuotationNumber,
    peekNextQuotationNumber,
    getQuotationPrefix,
} from "./infrastructure/quote-sequence";

import { QuoteService } from "./application/quote.service";
import { getQuoteRepository } from "./infrastructure/quote.repository";

let _svc: QuoteService | null = null;
export function getQuoteService(): QuoteService {
    if (!_svc) _svc = new QuoteService(getQuoteRepository());
    return _svc;
}
