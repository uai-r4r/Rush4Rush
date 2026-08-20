import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";
import { consume, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/**
 * POST /api/payments/manual  (multipart: paymentId, proof)
 *
 * The UPI QR + screenshot fallback, for the window before Razorpay KYC clears.
 *
 * Crucially this lives INSIDE the app, so the registration still lands in your
 * database and the club dashboard still works. A Google Form fallback would
 * put the data in a spreadsheet and quietly delete the feature it was meant to
 * back up.
 *
 * Marks the payment pending_review. A club admin approves it from the
 * dashboard, which is what flips the registration to confirmed and makes the
 * ticket QR appear.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    await consume(`upload:${user.id}`, LIMITS.uploadPerUser);

    const form = await req.formData();
    const paymentId = String(form.get("paymentId") ?? "");
    const file = form.get("proof");
    /**
     * Optional UTR typed by the payer. Unverified — anyone can type anything —
     * so it is a matching hint, never proof. But it turns a club admin's job
     * from squinting at a screenshot into searching a number, and it is what
     * reconciles against a bank statement later.
     */
    const payerRef = String(form.get("payerRef") ?? "").trim().slice(0, 40) || null;

    if (!/^[0-9a-f-]{36}$/i.test(paymentId)) {
      throw Object.assign(new Error("Invalid payment reference"), { status: 400 });
    }
    if (!(file instanceof File)) {
      throw Object.assign(new Error("Attach a payment screenshot"), { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      throw Object.assign(
        new Error("Screenshot is too large. Please upload an image under 5 MB."),
        { status: 413 },
      );
    }
    // Check the declared type AND re-derive the extension ourselves. Never
    // build a storage path out of a user-supplied filename — "../" in a name
    // is a path traversal.
    if (!ALLOWED.includes(file.type)) {
      throw Object.assign(new Error("Upload a JPG, PNG or WebP image"), { status: 415 });
    }

    const admin = createAdminClient();

    const { data: payment } = await admin
      .from("payments")
      .select("id, user_id, status")
      .eq("id", paymentId)
      .maybeSingle();

    if (!payment || payment.user_id !== user.id) {
      throw Object.assign(new Error("Payment not found"), { status: 404 });
    }
    if (payment.status === "paid") {
      throw Object.assign(new Error("This payment is already confirmed"), { status: 409 });
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/${paymentId}.${ext}`;

    const { error: upErr } = await admin.storage
      .from("payment-proofs")
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: true, // let them replace a blurry one
      });

    if (upErr) throw upErr;

    await admin
      .from("payments")
      .update({
        proof_path: path,
        payer_ref: payerRef,
        status: "pending_review",
        method: "manual_upi",
      })
      .eq("id", paymentId);

    return ok({ status: "pending_review" });
  } catch (err) {
    return handleError(err);
  }
}
