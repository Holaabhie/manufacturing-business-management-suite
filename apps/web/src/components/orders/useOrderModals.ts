import { useReducer, useCallback } from "react";
import type { OrderModalsState, OrderModalAction, OrderItem } from "./types";

const initialState: OrderModalsState = {
  paymentOrder: null,
  isPaymentOpen: false,
  deleteOrderId: null,
  isDeleteOpen: false,
  completionOrder: null,
  isCompletionOpen: false,
  invoicePreviewOrder: null,
  isInvoicePreviewOpen: false,
  longPressedOrder: null,
  isActionSheetOpen: false,
  staffSelectedOrder: null,
  isStaffDetailOpen: false,
};

function orderModalsReducer(
  state: OrderModalsState,
  action: OrderModalAction
): OrderModalsState {
  switch (action.type) {
    case "OPEN_PAYMENT":
      return { ...state, paymentOrder: action.order, isPaymentOpen: true };
    case "CLOSE_PAYMENT":
      return { ...state, paymentOrder: null, isPaymentOpen: false };
    case "OPEN_DELETE":
      return { ...state, deleteOrderId: action.orderId, isDeleteOpen: true };
    case "CLOSE_DELETE":
      return { ...state, deleteOrderId: null, isDeleteOpen: false };
    case "OPEN_COMPLETION":
      return { ...state, completionOrder: action.order, isCompletionOpen: true };
    case "CLOSE_COMPLETION":
      return { ...state, completionOrder: null, isCompletionOpen: false };
    case "OPEN_INVOICE_PREVIEW":
      return {
        ...state,
        invoicePreviewOrder: action.order,
        isInvoicePreviewOpen: true,
      };
    case "CLOSE_INVOICE_PREVIEW":
      return {
        ...state,
        invoicePreviewOrder: null,
        isInvoicePreviewOpen: false,
      };
    case "OPEN_ACTION_SHEET":
      return {
        ...state,
        longPressedOrder: action.order,
        isActionSheetOpen: true,
      };
    case "CLOSE_ACTION_SHEET":
      return { ...state, isActionSheetOpen: false };
    case "OPEN_STAFF_DETAIL":
      return {
        ...state,
        staffSelectedOrder: action.order,
        isStaffDetailOpen: true,
      };
    case "CLOSE_STAFF_DETAIL":
      return {
        ...state,
        staffSelectedOrder: null,
        isStaffDetailOpen: false,
      };
    default:
      return state;
  }
}

export function useOrderModals() {
  const [state, dispatch] = useReducer(orderModalsReducer, initialState);

  const openPayment = useCallback((order: OrderItem) => {
    dispatch({ type: "OPEN_PAYMENT", order });
  }, []);

  const closePayment = useCallback(() => {
    dispatch({ type: "CLOSE_PAYMENT" });
  }, []);

  const openDelete = useCallback((orderId: string) => {
    dispatch({ type: "OPEN_DELETE", orderId });
  }, []);

  const closeDelete = useCallback(() => {
    dispatch({ type: "CLOSE_DELETE" });
  }, []);

  const openCompletion = useCallback((order: OrderItem) => {
    dispatch({ type: "OPEN_COMPLETION", order });
  }, []);

  const closeCompletion = useCallback(() => {
    dispatch({ type: "CLOSE_COMPLETION" });
  }, []);

  const openInvoicePreview = useCallback((order: OrderItem) => {
    dispatch({ type: "OPEN_INVOICE_PREVIEW", order });
  }, []);

  const closeInvoicePreview = useCallback(() => {
    dispatch({ type: "CLOSE_INVOICE_PREVIEW" });
  }, []);

  const openActionSheet = useCallback((order: OrderItem) => {
    dispatch({ type: "OPEN_ACTION_SHEET", order });
  }, []);

  const closeActionSheet = useCallback(() => {
    dispatch({ type: "CLOSE_ACTION_SHEET" });
  }, []);

  const openStaffDetail = useCallback((order: OrderItem) => {
    dispatch({ type: "OPEN_STAFF_DETAIL", order });
  }, []);

  const closeStaffDetail = useCallback(() => {
    dispatch({ type: "CLOSE_STAFF_DETAIL" });
  }, []);

  return {
    state,
    openPayment,
    closePayment,
    openDelete,
    closeDelete,
    openCompletion,
    closeCompletion,
    openInvoicePreview,
    closeInvoicePreview,
    openActionSheet,
    closeActionSheet,
    openStaffDetail,
    closeStaffDetail,
  };
}
