export interface BillingHistoryItem {
  id: string;
  plan: string | null;
  amount: number;
  currency: string;
  startDate: string;
  invoicePdf: string;
  hostedInvoiceUrl: string;
}

export interface BillingHistoryResponse {
  data: BillingHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
}
