import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

type WorkReportEvent = {
  name?: string;
  description?: string;
  eventDate?: Date | string | null;
  isDateTbd?: boolean;
  regedUsers?: number;
};

type DocxAlignment = (typeof AlignmentType)[keyof typeof AlignmentType];

function formatRuDate(date: Date): string {
  // Пример: 24.12.2025
  return date.toLocaleDateString("ru-RU");
}

function formatEventDate(event: WorkReportEvent): string {
  if (event.isDateTbd) return "Дата уточняется";
  if (!event.eventDate) return "—";
  const d = typeof event.eventDate === "string" ? new Date(event.eventDate) : event.eventDate;
  if (Number.isNaN(d.getTime())) return "—";
  return formatRuDate(d);
}

function extractLinks(text: string): string[] {
  if (!text) return [];

  const matches: string[] = [];
  const withScheme = text.match(/https?:\/\/[^\s<>()]+/gi) ?? [];
  matches.push(...withScheme);

  const bare = text.match(/\b(?:vk\.com|t\.me|instagram\.com|ok\.ru)\/[^\s<>()]+/gi) ?? [];
  matches.push(...bare.map((x) => `https://${x}`));

  // Дедуп + лёгкая нормализация
  const uniq = new Map<string, string>();
  for (const url of matches) {
    const trimmed = url.trim().replace(/[),.;]+$/g, "");
    uniq.set(trimmed.toLowerCase(), trimmed);
  }
  return Array.from(uniq.values());
}

function paragraphLines(text: string, align?: DocxAlignment): Paragraph[] {
  const cleaned = (text ?? "").toString().trim();
  if (!cleaned) {
    return [new Paragraph({ text: "—", alignment: align })];
  }
  return cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => new Paragraph({ text: line, alignment: align }));
}

export async function buildWorkReportDocx(params: {
  graphName: string;
  events: WorkReportEvent[];
}): Promise<Buffer> {
  const { graphName, events } = params;

  const title = new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: "Отчет о проделанной работе ", bold: true, size: 28 }), // 14pt = 28 half-points
      new TextRun({ text: graphName ?? "—", bold: true, size: 28 }),
      new TextRun({ text: " КГТУ", bold: true, size: 28 }),
    ],
  });

  const semester = new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "за I семестр 2025 учебного года", size: 28 })], // 14pt = 28 half-points
  });

  // Ширины колонок в процентах (сумма должна быть ~100)
  // Колонка "Краткое описание" сделана шире
  const columnWidths = [12, 18, 35, 12, 23]; // в процентах

  const headerCells = [
    "Дата проведения",
    "Название мероприятия",
    "Краткое описание/суть мероприятия/результаты",
    "Количество участников(студенты, организаторы, приглашенные и т.п.)",
    "Наличие фото материалов или статей с указанием ссылок в социальных сетях",
  ].map(
    (text, index) =>
      new TableCell({
        width: { size: columnWidths[index], type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text, bold: true })],
          }),
        ],
      }),
  );

  const rows: TableRow[] = [
    new TableRow({ children: headerCells }),
    ...events.map((e) => {
      const links = extractLinks(e.description ?? "");
      const linksParagraphs =
        links.length > 0 ? links.map((l) => new Paragraph({ text: l })) : [new Paragraph({ text: "—" })];

      const participantsCount = typeof e.regedUsers === "number" ? e.regedUsers : 0;
      const participantsText = `${participantsCount} чел.`;

      return new TableRow({
        children: [
          new TableCell({
            width: { size: columnWidths[0], type: WidthType.PERCENTAGE },
            children: [new Paragraph({ text: formatEventDate(e) })],
          }),
          new TableCell({
            width: { size: columnWidths[1], type: WidthType.PERCENTAGE },
            children: [new Paragraph({ text: (e.name ?? "—").toString() })],
          }),
          new TableCell({
            width: { size: columnWidths[2], type: WidthType.PERCENTAGE },
            children: paragraphLines(e.description ?? ""),
          }),
          new TableCell({
            width: { size: columnWidths[3], type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                text: participantsText,
              }),
            ],
          }),
          new TableCell({
            width: { size: columnWidths[4], type: WidthType.PERCENTAGE },
            children: linksParagraphs,
          }),
        ],
      });
    }),
  ];

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows,
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 landscape width in twips (297mm)
              height: 8390, // A4 landscape height in twips (210mm)
            },
            margin: {
              top: 1440, // 2.54cm (1 inch)
              right: 720, // 1.27cm (0.5 inch) - уменьшенный правый отступ
              bottom: 1440, // 2.54cm (1 inch)
              left: 1440, // 2.54cm (1 inch)
            },
          },
        },
        children: [
          title,
          semester,
          new Paragraph({ text: "" }),
          table,
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}


