const BASE = process.env.INTASEND_IS_SANDBOX === "false"
  ? "https://payment.intasend.com"
  : "https://sandbox.intasend.com";

export function intasendConfigured() {
  return !!(process.env.INTASEND_SECRET_KEY);
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.INTASEND_SECRET_KEY}`,
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
    headers: headers(),
    body: JSON.stringify({ amount, phone_number: phone, api_ref: apiRef }),
  });

  const data = await res.json() as StkPushResult & { detail?: string; errors?: unknown };

  if (!res.ok) {
    const msg = (data as { detail?: string }).detail ?? "IntaSend STK push failed";
    throw Object.assign(new Error(msg), { statusCode: res.status >= 500 ? 502 : 400 });
  }

  return data;
}

export async function getInvoiceStatus(invoiceId: string): Promise<{
  state: "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";
  failed_reason: string | null;
}> {
  const res = await fetch(`${BASE}/api/v1/payment/collection/?invoice_id=${invoiceId}`, {
    headers: headers(),
  });
  const data = await res.json() as { state: string; failed_reason?: string | null };
  return {
    state: data.state as "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED",
    failed_reason: data.failed_reason ?? null,
  };
}

// Payload IntaSend POSTs to our callback URL
export interface IntaSendCallback {
  invoice_id: string;
  state: "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";
  value: string;
  account: string;
  api_ref: string | null;
  failed_reason: string | null;
  failed_code: string | null;
}
