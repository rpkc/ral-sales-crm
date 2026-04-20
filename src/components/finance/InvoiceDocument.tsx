import { forwardRef } from "react";
import type { Invoice } from "@/lib/finance-types";
import { DOC_TYPE_LABELS, DOC_TYPE_PREFIX, type InvoiceDocType } from "@/lib/invoice-dispatch-store";
import { fmtINR, fmtDate } from "./FinanceKpi";

interface Props {
  invoice: Invoice;
  docType: InvoiceDocType;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientAddress?: string;
}

const BRAND = {
  name: "Red Apple Learning",
  tagline: "India's Premier Design & Technology Institute",
  primary: "#E31E24",
  secondary: "#1A1A1A",
  address: "5th Floor, Salt Lake Sector V, Kolkata, West Bengal 700091",
  email: "accounts@redapple.com",
  phone: "+91 98300 00000",
  gstin: "19ABCDE1234F1Z2",
  pan: "ABCDE1234F",
  bank: {
    bankName: "HDFC Bank",
    accountName: "Red Apple Learning Pvt. Ltd.",
    accountNumberMasked: "XXXX XXXX 4521",
    ifsc: "HDFC0000123",
    upi: "redapple@hdfc",
  },
};

const docNumberFor = (docType: InvoiceDocType, invoiceNo: string) => {
  const prefix = DOC_TYPE_PREFIX[docType];
  // Replace existing INV-/anything- with the doc-type prefix
  if (invoiceNo.startsWith(prefix + "-")) return invoiceNo;
  return invoiceNo.replace(/^[A-Z]+-/, prefix + "-");
};

/**
 * Branded printable invoice — fixed 794px width (~A4 @ 96dpi) so html2canvas → jsPDF
 * produces consistent A4 output. Uses inline styles only (no Tailwind theme tokens)
 * so it renders identically off-screen during rasterisation.
 */
export const InvoiceDocument = forwardRef<HTMLDivElement, Props>(function InvoiceDocument(
  { invoice, docType, recipientEmail, recipientPhone, recipientAddress },
  ref
) {
  const docNo = docNumberFor(docType, invoice.invoiceNo);
  const docLabel = DOC_TYPE_LABELS[docType];
  const isCredit = docType === "credit_note";
  const taxable = invoice.subtotal - invoice.discount;
  const balance = invoice.total - invoice.amountPaid;
  const upiQR = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=upi://pay?pa=${encodeURIComponent(BRAND.bank.upi)}%26pn=${encodeURIComponent(BRAND.name)}%26am=${balance}%26cu=INR`;

  return (
    <div
      ref={ref}
      style={{
        width: 794,
        minHeight: 1123,
        padding: 36,
        background: "#ffffff",
        color: BRAND.secondary,
        fontFamily: "Inter, Arial, Helvetica, sans-serif",
        fontSize: 12,
        lineHeight: 1.5,
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `4px solid ${BRAND.primary}`, paddingBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 44, height: 44, background: BRAND.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22, borderRadius: 8 }}>
              R
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: BRAND.primary, lineHeight: 1.1 }}>{BRAND.name}</div>
              <div style={{ fontSize: 10, color: "#666" }}>{BRAND.tagline}</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 8, maxWidth: 320 }}>
            {BRAND.address}<br />
            {BRAND.email} · {BRAND.phone}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.secondary, textTransform: "uppercase", letterSpacing: 1 }}>{docLabel}</div>
          <div style={{ marginTop: 6, fontSize: 11 }}>
            <div><b>No:</b> {docNo}</div>
            <div><b>Date:</b> {fmtDate(invoice.issueDate)}</div>
            <div><b>Due:</b> {fmtDate(invoice.dueDate)}</div>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, gap: 16 }}>
        <div style={{ flex: 1, padding: 12, background: "#FAFAFA", borderRadius: 8, border: "1px solid #EEE" }}>
          <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Bill To</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{invoice.customerName}</div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{invoice.customerType}</div>
          {recipientEmail && <div style={{ fontSize: 10, color: "#555" }}>{recipientEmail}</div>}
          {recipientPhone && <div style={{ fontSize: 10, color: "#555" }}>{recipientPhone}</div>}
          {recipientAddress && <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{recipientAddress}</div>}
          {invoice.gstin && <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>GSTIN: {invoice.gstin}</div>}
        </div>
        <div style={{ width: 230, padding: 12, background: "#FAFAFA", borderRadius: 8, border: "1px solid #EEE" }}>
          <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>From</div>
          <div style={{ fontSize: 11, fontWeight: 700 }}>{BRAND.name}</div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>GSTIN: {BRAND.gstin}</div>
          <div style={{ fontSize: 10, color: "#555" }}>PAN: {BRAND.pan}</div>
          <div style={{ fontSize: 10, color: "#555" }}>State: West Bengal (19)</div>
        </div>
      </div>

      {/* Line items */}
      <div style={{ marginTop: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: BRAND.secondary, color: "#fff" }}>
              <th style={{ textAlign: "left", padding: "10px 12px", width: 36 }}>#</th>
              <th style={{ textAlign: "left", padding: "10px 12px" }}>Description</th>
              <th style={{ textAlign: "right", padding: "10px 12px", width: 80 }}>Qty</th>
              <th style={{ textAlign: "right", padding: "10px 12px", width: 100 }}>Rate</th>
              <th style={{ textAlign: "right", padding: "10px 12px", width: 110 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "10px 12px", borderBottom: "1px solid #EEE" }}>1</td>
              <td style={{ padding: "10px 12px", borderBottom: "1px solid #EEE" }}>
                <div style={{ fontWeight: 600 }}>{invoice.programName || invoice.revenueStream}</div>
                <div style={{ color: "#777", fontSize: 10 }}>{invoice.revenueStream}{invoice.notes ? ` · ${invoice.notes}` : ""}</div>
              </td>
              <td style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #EEE" }}>1</td>
              <td style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #EEE" }}>{fmtINR(invoice.subtotal)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #EEE", fontWeight: 600 }}>{fmtINR(invoice.subtotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals + Payment */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, gap: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ padding: 12, border: "1px solid #EEE", borderRadius: 8, background: "#FAFAFA" }}>
            <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Payment Information</div>
            <div style={{ fontSize: 10, lineHeight: 1.7 }}>
              <div><b>Bank:</b> {BRAND.bank.bankName}</div>
              <div><b>Account Name:</b> {BRAND.bank.accountName}</div>
              <div><b>Account No:</b> {BRAND.bank.accountNumberMasked}</div>
              <div><b>IFSC:</b> {BRAND.bank.ifsc}</div>
              <div><b>UPI:</b> {BRAND.bank.upi}</div>
            </div>
          </div>
          {balance > 0 && (
            <div style={{ marginTop: 10, padding: 10, border: `1px dashed ${BRAND.primary}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <img src={upiQR} alt="UPI QR" width={80} height={80} style={{ borderRadius: 4 }} crossOrigin="anonymous" />
              <div style={{ fontSize: 10, color: "#555" }}>
                Scan to pay <b>{fmtINR(balance)}</b><br />
                via any UPI app — instant confirmation.
              </div>
            </div>
          )}
        </div>

        <div style={{ width: 280 }}>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
            <tbody>
              <tr><td style={{ padding: "5px 0", color: "#666" }}>Subtotal</td><td style={{ padding: "5px 0", textAlign: "right" }}>{fmtINR(invoice.subtotal)}</td></tr>
              {invoice.discount > 0 && <tr><td style={{ padding: "5px 0", color: "#666" }}>Discount</td><td style={{ padding: "5px 0", textAlign: "right", color: "#10b981" }}>− {fmtINR(invoice.discount)}</td></tr>}
              <tr><td style={{ padding: "5px 0", color: "#666" }}>Taxable</td><td style={{ padding: "5px 0", textAlign: "right" }}>{fmtINR(taxable)}</td></tr>
              {invoice.cgst > 0 && <tr><td style={{ padding: "5px 0", color: "#666" }}>CGST ({invoice.gstRate / 2}%)</td><td style={{ padding: "5px 0", textAlign: "right" }}>{fmtINR(invoice.cgst)}</td></tr>}
              {invoice.sgst > 0 && <tr><td style={{ padding: "5px 0", color: "#666" }}>SGST ({invoice.gstRate / 2}%)</td><td style={{ padding: "5px 0", textAlign: "right" }}>{fmtINR(invoice.sgst)}</td></tr>}
              {invoice.igst > 0 && <tr><td style={{ padding: "5px 0", color: "#666" }}>IGST ({invoice.gstRate}%)</td><td style={{ padding: "5px 0", textAlign: "right" }}>{fmtINR(invoice.igst)}</td></tr>}
              <tr style={{ borderTop: "2px solid #1A1A1A" }}>
                <td style={{ padding: "8px 0", fontWeight: 800, fontSize: 13 }}>Grand Total</td>
                <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 800, fontSize: 13, color: BRAND.primary }}>
                  {isCredit ? "− " : ""}{fmtINR(invoice.total)}
                </td>
              </tr>
              {invoice.amountPaid > 0 && (
                <>
                  <tr><td style={{ padding: "5px 0", color: "#666" }}>Paid</td><td style={{ padding: "5px 0", textAlign: "right", color: "#10b981" }}>{fmtINR(invoice.amountPaid)}</td></tr>
                  <tr style={{ background: balance > 0 ? "#FEF2F2" : "#F0FDF4" }}>
                    <td style={{ padding: "8px 8px", fontWeight: 700 }}>Balance Due</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: 700, color: balance > 0 ? BRAND.primary : "#10b981" }}>
                      {fmtINR(balance)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer / Signature */}
      <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div style={{ flex: 1, fontSize: 10, color: "#666", lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, color: BRAND.secondary, marginBottom: 4 }}>Terms & Notes</div>
          <div>· Payment due by {fmtDate(invoice.dueDate)}. Late payments attract interest @ 1.5% / month.</div>
          <div>· Cheques in favour of "{BRAND.bank.accountName}".</div>
          <div>· This is a system-generated document and does not require a physical signature.</div>
          {docType === "proforma_invoice" && <div>· This is a proforma invoice for advance payment; tax invoice will follow on receipt.</div>}
          {docType === "quotation" && <div>· Quotation valid for 15 days from date of issue.</div>}
        </div>
        <div style={{ width: 200, textAlign: "center" }}>
          <div style={{ borderBottom: "1px solid #1A1A1A", marginBottom: 6, paddingBottom: 28, fontFamily: "'Brush Script MT', cursive", fontSize: 18, color: BRAND.primary }}>
            Authorised Sign.
          </div>
          <div style={{ fontSize: 10, color: "#666" }}>For {BRAND.name}</div>
        </div>
      </div>

      <div style={{ marginTop: 18, paddingTop: 10, borderTop: "1px solid #EEE", textAlign: "center", fontSize: 9, color: "#999" }}>
        Generated by Red Apple CRM · {fmtDate(new Date().toISOString())} · Document hash: {docNo}-{invoice.id.slice(-6)}
      </div>
    </div>
  );
});
