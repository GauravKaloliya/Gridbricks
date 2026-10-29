export type IntervalStatus =
  | "matched"
  | "missing_forecast"
  | "missing_actual"
  | "invalid_record"
  | "upstream_unavailable";

export interface CutoffInfo {
  local_time: string;
  timezone: string;
  inclusive: boolean;
  rule: string;
  assumption: string;
}

export interface DataFreshness {
  retrieved_at: string | null;
  data_state: "live" | "cache" | "snapshot" | "snapshot_fallback";
  source: string;
  cache_age_seconds: number | null;
  is_fallback: boolean;
  note: string | null;
  warnings: string[];
}

export interface IntervalResult {
  start_time: string;
  end_time: string;
  decision_cutoff: string;
  selected_publish_time: string | null;
  forecast_generation: number | null;
  actual_generation: number | null;
  signed_error: number | null;
  absolute_error: number | null;
  status: IntervalStatus;
  detail: string | null;
  actual_periods_used: number;
  eligible_forecast_count: number;
  lead_time_hours: number | null;
}

export interface AnalysisCounts {
  candidate_count: number;
  matched_count: number;
  missing_forecast_count: number;
  missing_actual_count: number;
  invalid_record_count: number;
  coverage_pct: number;
}

export interface AccuracyMetrics {
  status: "ok" | "no_data";
  mae: number | null;
  rmse: number | null;
  mbe: number | null;
  matched_count: number;
  unit: string;
  sign_convention: string;
}

export interface LeadTimeBucket {
  label: string;
  lower_hours: number | null;
  upper_hours: number | null;
  matched_count: number;
  mae: number | null;
  mean_signed_error: number | null;
}

export interface DecisionSupport {
  p90_absolute_error: number | null;
  p95_absolute_error: number | null;
  p90_shortfall: number | null;
  underforecast_share_pct: number | null;
  lead_time_buckets: LeadTimeBucket[];
  method: string;
}

export interface AccuracyResponse {
  start_date: string;
  end_date: string;
  timezone: string;
  unit: string;
  forecast_resolution_minutes: number;
  actual_resolution_minutes: number;
  matching_rule: string;
  cutoff: CutoffInfo;
  counts: AnalysisCounts;
  metrics: AccuracyMetrics;
  decision_support?: DecisionSupport;
  intervals: IntervalResult[];
  freshness: DataFreshness;
}

export interface ActualRecord {
  start_time: string;
  publish_time: string;
  generation: number;
  fuel_type: "WIND";
  settlement_date: string | null;
  settlement_period: number | null;
  source: string;
}

export interface HourlyActual {
  start_time: string;
  generation: number;
  periods_used: number;
}

export interface ActualsResponse {
  start_date: string;
  end_date: string;
  unit: string;
  actual_resolution_minutes: number;
  hourly_resolution_minutes: number;
  records: ActualRecord[];
  hourly: HourlyActual[];
  freshness: DataFreshness;
}

export interface MetaResponse {
  app_name: string;
  analysis_start: string;
  analysis_end: string;
  timezone: string;
  forecast_resolution_minutes: number;
  actual_resolution_minutes: number;
  cutoff: CutoffInfo;
  data_mode: string;
  source_attribution: string;
  disclaimer: string;
}

export interface ForecastRevision {
  publish_time: string;
  generation: number;
  eligible: boolean;
  selected: boolean;
}

export interface RevisionsResponse {
  start_time: string;
  decision_cutoff: string;
  selected_publish_time: string | null;
  status: IntervalStatus;
  revisions: ForecastRevision[];
  freshness: DataFreshness;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    request_id?: string;
  };
}
