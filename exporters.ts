import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export function exportToExcel(rows: any[], filename: string) {
  if (!rows.length) return;
  const flat = rows.map((r) => {
    const out: any = { ...r };
    for (const k of Object.keys(out)) {
      if (out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) {
        out[k] = (out[k] as any).name ?? (out[k] as any).full_name ?? (out[k] as any).email ?? JSON.stringify(out[k]);
      }
    }
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(flat);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}_${format(new Date(), "yyyyMMdd")}.xlsx`);
}

export function exportReportsToPdf(rows: any[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.setTextColor(11, 61, 145);
  doc.text("South Group Portal — Reports Export", 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Generated ${format(new Date(), "PPp")}`, 14, 22);
  autoTable(doc, {
    startY: 28,
    head: [["Date", "Church", "Department", "Unit", "Submitter", "Attend.", "Souls", "Offering", "Status"]],
    body: rows.map((r) => [
      format(new Date(r.report_date), "MMM d, yyyy"),
      r.churches?.name ?? "—",
      r.departments?.name ?? "—",
      r.units?.name ?? "—",
      r.profiles?.full_name ?? r.profiles?.email ?? "—",
      r.total_attendance ?? 0,
      r.souls_won ?? 0,
      Number(r.offering_amount ?? 0).toLocaleString(),
      r.status,
    ]),
    headStyles: { fillColor: [11, 61, 145] },
    styles: { fontSize: 8 },
  });
  doc.save(`reports_${format(new Date(), "yyyyMMdd")}.pdf`);
}

export function exportAnalyticsToPdf(title: string, sections: { heading: string; rows: any[][]; columns: string[] }[]) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.setTextColor(11, 61, 145);
  doc.text(title, 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Generated ${format(new Date(), "PPp")}`, 14, 22);
  let y = 30;
  for (const s of sections) {
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(s.heading, 14, y);
    autoTable(doc, {
      startY: y + 3,
      head: [s.columns],
      body: s.rows,
      headStyles: { fillColor: [11, 61, 145] },
      styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }
  doc.save(`${title.replace(/\s+/g, "_").toLowerCase()}_${format(new Date(), "yyyyMMdd")}.pdf`);
}
