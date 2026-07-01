// Sandbox:    https://sandbox.intasend.com
// Production: https://api.intasend.com
const BASE = process.env.INTASEND_IS_SANDBOX === "false"
  ? "https://api.intasend.com"
  : "https://sandbox.intasend.com";

export function intasendConfigured() {
  return !!(process.env.INTASEND_SECRET_KEY);
}

function authHeaders() {
  return {
    Authorization: `Token ${process.env.INTASEND_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

export interface StkPushResult {
  invoice: {
    invoice_id: string;
    state: "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";
    value: string;
    account: string;
    created_at: string;
  };
  customer: { customer_id: string; phone_number: string } | null;
  payment_link: string | null;
}

export async function initiateStkPush(
  phone: string,
  amount: number,
  apiRef: string
): Promise<StkPushResult> {
  const res = await fetch(`${BASE}/api/v1/payment/mpesa-stk-push/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ amount, phone_number: phone, api_ref: apiRef }),
  });

  const data = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    // Surface the actual IntaSend error for easier debugging
    const detail = (data.detail ?? data.error ?? data.message ?? JSON.stringify(data)) as string;
    console.error("[IntaSend] STK push failed:", res.status, data);
    throw Object.assign(new Error(String(detail)), { statusCode: res.status >= 500 ? 502 : 400 });
  }

  return data as unknown as StkPushResult;
}

export async function getInvoiceStatus(invoiceId: string): Promise<{
  state: "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";
  failed_reason: string | null;
}> {
  const res = await fetch(`${BASE}/api/v1/payment/collection/?invoice_id=${invoiceId}`, {
    headers: authHeaders(),
  });
  const data = await res.json() as { state: string; failed_reason?: string | null };
  return {
    state: data.state as "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED",
    failed_reason: data.failed_reason ?? null,
  };
}

export interface IntaSendCallback {
  invoice_id: string;
  state: "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";
  value: string;
  account: string;
  api_ref: string | null;
  failed_reason: string | null;
  failed_code: string | null;
}
