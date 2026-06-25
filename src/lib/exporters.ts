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

type ReportExportSection = {
  heading: string;
  rows: Array<[string, string | number]>;
};

export function exportSingleReportToExcel(report: any, attachments: any[] = []) {
  const wb = XLSX.utils.book_new();
  for (const section of buildSingleReportSections(report, attachments)) {
    const ws = XLSX.utils.aoa_to_sheet([["Field", "Value"], ...section.rows]);
    ws["!cols"] = [{ wch: 28 }, { wch: 48 }];
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(section.heading));
  }
  XLSX.writeFile(wb, `${singleReportFileName(report)}.xlsx`);
}

export function exportSingleReportToPdf(report: any, attachments: any[] = []) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.setTextColor(11, 61, 145);
  doc.text("South Group Portal - Individual Report", 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Generated ${format(new Date(), "PPp")}`, 14, 22);

  let y = 32;
  for (const section of buildSingleReportSections(report, attachments)) {
    if (y > 250) {
      doc.addPage();
      y = 16;
    }
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(section.heading, 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Field", "Value"]],
      body: section.rows,
      headStyles: { fillColor: [11, 61, 145] },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: "bold" },
        1: { cellWidth: 120 },
      },
      margin: { left: 14, right: 14 },
    });
    y = ((doc as any).lastAutoTable?.finalY ?? y) + 10;
  }

  doc.save(`${singleReportFileName(report)}.pdf`);
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

function buildSingleReportSections(report: any, attachments: any[] = []): ReportExportSection[] {
  const customSections: ReportExportSection[] =
    Array.isArray(report.custom_fields) && report.custom_fields.length > 0
      ? [
          {
            heading: "Report Details",
            rows: report.custom_fields.map((field: any, index: number) => [
              display(field.label || `Field ${index + 1}`),
              displayCustomFieldValue(field),
            ]),
          },
        ]
      : [
          {
            heading: "Membership Statistics",
            rows: [
              ["Total Attendance", numberDisplay(report.total_attendance)],
              ["Male", numberDisplay(report.male_attendance)],
              ["Female", numberDisplay(report.female_attendance)],
              ["Children", numberDisplay(report.children_attendance)],
              ["First Timers", numberDisplay(report.first_timers)],
              ["New Converts", numberDisplay(report.new_converts)],
              ["Holy Ghost Receivers", numberDisplay(report.holy_ghost_receivers)],
              ["Active Members", numberDisplay(report.active_members)],
            ],
          },
          {
            heading: "Cell Ministry",
            rows: [
              ["Cells", numberDisplay(report.num_cells)],
              ["Meetings Held", numberDisplay(report.cell_meetings_held)],
              ["Average Attendance", numberDisplay(report.avg_cell_attendance)],
              ["Active Leaders", numberDisplay(report.active_cell_leaders)],
            ],
          },
          {
            heading: "Evangelism",
            rows: [
              ["Outreaches", numberDisplay(report.num_outreaches)],
              ["Souls Reached", numberDisplay(report.souls_reached)],
              ["Souls Won", numberDisplay(report.souls_won)],
              ["Follow-Ups", numberDisplay(report.follow_ups)],
            ],
          },
          {
            heading: "Finance",
            rows: [
              ["Offering", moneyDisplay(report.offering_amount)],
              ["Partnership", moneyDisplay(report.partnership_amount)],
              ["Special Giving", moneyDisplay(report.special_giving)],
            ],
          },
          {
            heading: "Programs",
            rows: [
              ["Programs Held", numberDisplay(report.programs_held)],
              ["Special Events", numberDisplay(report.special_events)],
              ["Outreach Programs", numberDisplay(report.outreach_programs)],
              ["Prayer Meetings", numberDisplay(report.prayer_meetings)],
            ],
          },
        ];

  return [
    {
      heading: "General Information",
      rows: [
        ["Church", display(report.churches?.name)],
        ["Department", display(report.departments?.name)],
        ["Unit", display(report.units?.name)],
        ["Reporting Period", display(report.reporting_period)],
        ["Week #", display(report.week_number)],
        ["Month", display(report.month)],
        ["Year", display(report.year)],
        ["Report Date", formatExportDate(report.report_date)],
        ["Status", report.status === "approved" ? "Published" : display(report.status?.replace("_", " "))],
        ["Submitted By", display(report.profiles?.full_name ?? report.profiles?.email)],
      ],
    },
    {
      heading: "Submission Timeline",
      rows: [
        ["Submitted At", formatExportDateTime(report.submitted_at)],
        ["Published At", formatExportDateTime(report.approved_at)],
        ["Reviewed At", formatExportDateTime(report.reviewed_at)],
        ["Last Updated", formatExportDateTime(report.updated_at)],
        ["Report ID", display(report.id)],
      ],
    },
    ...customSections,
    {
      heading: "Notes",
      rows: [["Notes", display(report.notes)]],
    },
    {
      heading: "Attachments",
      rows: attachments.length
        ? attachments.map((attachment, index) => [
            `Attachment ${index + 1}`,
            `${display(attachment.file_name)} (${formatFileSize(attachment.file_size)})`,
          ])
        : [["Attachments", "No attachments"]],
    },
  ];
}

function display(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return value;
}

function numberDisplay(value: number | null | undefined) {
  return Number(value ?? 0);
}

function moneyDisplay(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function displayCustomFieldValue(field: { value?: string | number | null; type?: string }) {
  if (field.value === null || field.value === undefined || field.value === "") return "-";
  if (field.type === "money") return moneyDisplay(Number(field.value));
  if (field.type === "date") return formatExportDate(String(field.value));
  return String(field.value);
}

function formatExportDate(value: string | null | undefined) {
  if (!value) return "-";
  return format(new Date(value), "PPP");
}

function formatExportDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return format(new Date(value), "PPp");
}

function formatFileSize(value: number | null | undefined) {
  if (!value) return "0 KB";
  return `${(value / 1024).toFixed(1)} KB`;
}

function singleReportFileName(report: any) {
  return `report_${slugPart(report.churches?.name)}_${slugPart(report.departments?.name)}_${format(new Date(report.report_date), "yyyyMMdd")}`;
}

function slugPart(value: string | null | undefined) {
  return (value ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function safeSheetName(value: string) {
  return value.replace(/[\\/?*[\]:]/g, "").slice(0, 31);
}
