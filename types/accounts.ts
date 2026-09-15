export type AccountSummary = {
  fitter_id: string;
  accepted_count: number;
  completed_count: number;
  current_count: number;
  outstanding_iqd: number;
  settled_iqd: number;
  total_iqd: number;
  last_accepted_at: string | null;
};
export type AccountCharge = {
  id: string;
  dispatch_id: string;
  fitter_id: string;
  amount_iqd: number;
  created_at: string;
  settlement_id: string | null;
};
export type AccountSettlement = {
  id: string;
  fitter_id: string;
  amount_iqd: number;
  job_count: number;
  note: string;
  created_at: string;
};
export type AccountDetail = {
  charges: AccountCharge[];
  settlements: AccountSettlement[];
};
