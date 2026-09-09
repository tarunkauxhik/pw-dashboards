export interface MetaRow {
  source: string;
  status: "OK" | "STALE" | "ERROR" | "NO_EMAIL" | "MISSING_FILE" | "TOO_FEW_ROWS";
  data_as_of_ist: string;
  rows: number;
  note: string;
}

export interface OrderRow {
  order_date_ist: string;
  userid: string;
  price: number;
  source: "PAYMENT" | "PW_PLAN" | "ADMIN" | "BLANK" | "APPLE_IAP" | string;
  plantype: "DIRECT" | "FLEXI" | string;
  platform: "ANDROID" | "IOS" | "WEB" | "BLANK";
  coupon_code: string;
  coupon_discount: number;
  gateway: "PAYU" | "PAYTM" | "UNKNOWN";
  payment_method: string;
}

export interface SignupRow {
  report_date_ist: string;
  signups: number;
}

export interface BuyTypeRow {
  plantype: string;
  distinct_ids: number;
  overall_rev: number;
}

export interface AttributionRow {
  userid: string;
  media_source: string;
  af_channel: string;
  campaign: string;
}

export interface PushRow {
  report_date: string;
  campaign_name: string;
  sent: number;
  unique_clicks: number;
  converted_users: number;
  attributed_revenue: number;
}

export interface AppsFlyerRow {
  report_date: string;
  app_platform: "ANDROID" | "IOS";
  media_source: string;
  campaign: string;
  impressions: number;
  clicks: number;
  installs: number;
  cost_inr: number;
}

export interface SheetData {
  mb_orders: OrderRow[];
  mb_signups_daily: SignupRow[];
  mb_buy_type: BuyTypeRow[];
  mb_paid_user_attribution: AttributionRow[];
  mb_push_daily: PushRow[];
  af_daily: AppsFlyerRow[];
  _meta: MetaRow[];
}
