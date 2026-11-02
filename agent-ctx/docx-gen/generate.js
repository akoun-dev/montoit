// Génération du checklist des fonctionnalités par acteur — Mon Toit CI
// Recipe couverture : R1 (Pure Paragraph Left) — design-system.md
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, PageNumber, PageBreak,
  BorderStyle, WidthType, ShadingType, TableLayoutType, SectionType,
  NumberFormat, TableOfContents, VerticalAlign,
} = require("docx");
const fs = require("fs");
const { ACTORS, TRANSVERSE, PRIORITIES } = require("./data.js");

// ---------------------------------------------------------------- palette
// Terracotta (immobilier / consulting) — design-system.md
const P = {
  primary: "3A2E24",
  body: "000000",            // Profil A (formel) : corps noir pur
  secondary: "6E655C",
  accent: "A0653A",
  surface: "FAF5EF",
  tableHeaderBg: "8C5430",
  tableHeaderText: "FFFFFF",
  innerLine: "D9CFC4",
};
const COVER = {
  bg: "2B2118", titleColor: "F7F2EA", subtitleColor: "D9CDBF",
  metaColor: "C7B9A8", accent: "D08C4A", footerColor: "9C8F80",
};
const STATUS = {
  EXISTANTE:   { label: "Existante",   color: "1B7A43" },
  PARTIELLE:   { label: "Partielle",   color: "B45309" },
  MANQUANTE:   { label: "Manquante",   color: "B3261E" },
  ACONFIRMER:  { label: "À confirmer", color: "6B7280" },
};
const FONT = { ascii: "Calibri", eastAsia: "Microsoft YaHei", hAnsi: "Calibri" };

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

// ------------------------------------------------- utilitaires couverture
function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([..."，。、；：！？", ..."的与和及之在于为", ..."-_—–·/", ..." \t"]);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop();
    lines[lines.length - 1] += " " + last;
  }
  return lines;
}

// Version latine : largeur moyenne d'un caractère ≈ pt x 11 twips (vs pt x 20 CJK)
function calcTitleLayoutLatin(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charWidth = (pt) => pt * 11;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt, lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    lines = splitTitleLines(title, charsPerLine(minPt));
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function calcCoverSpacing(params) {
  const {
    titleLineCount = 1, titlePt = 36, hasSubtitle = false,
    hasEnglishLabel = false, metaLineCount = 0,
    fixedHeight = 800, pageHeight = 16838, marginTop = 0, marginBottom = 0,
  } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - marginTop - marginBottom - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight + metaHeight + fixedHeight + implicitParaHeight;
  const remainingSpace = usableHeight - contentHeight;
  const safeRemaining = Math.max(remainingSpace, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45);
  const rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  const midSpacing = Math.max(safeRemaining - topSpacing - bottomSpacing, 0);
  return { topSpacing, midSpacing, bottomSpacing };
}

// ------------------------------------------------------------ cover R1
function buildCoverR1(config) {
  const C = config.palette;
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayoutLatin(config.title, availableWidth, 40, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length,
    fixedHeight: 400,
  });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: C.accent, space: 12 };
  const children = [];

  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));

  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.accent, space: 8 } },
      children: [new TextRun({
        text: config.englishLabel.split("").join("  "),
        size: 18, color: C.accent, font: { ascii: "Calibri", eastAsia: "SimHei" }, characterSpacing: 40,
      })],
    }));
  }

  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({
        text: titleLines[i], size: titleSize, bold: true,
        color: C.titleColor, font: { eastAsia: "SimHei", ascii: "Arial" },
      })],
    }));
  }

  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 800 },
      children: [new TextRun({
        text: config.subtitle, size: 24, color: C.subtitleColor,
        font: { eastAsia: "Microsoft YaHei", ascii: "Arial" },
      })],
    }));
  }

  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({
        text: line, size: 24, color: C.metaColor,
        font: { eastAsia: "Microsoft YaHei", ascii: "Arial" },
      })],
    }));
  }

  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));

  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: C.footerColor, font: { ascii: "Arial" } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: C.footerColor, font: { ascii: "Arial" } }),
    ],
  }));

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: C.bg },
        borders: noBorders,
        children,
      })],
    })],
  })];
}

// ---------------------------------------------------- helpers document
function h1(text, { pageBreak = true } = {}) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: pageBreak,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32, color: P.primary, font: FONT })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, color: P.primary, font: FONT })],
  });
}
function body(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: opts.after !== undefined ? opts.after : 120 },
    children: [new TextRun({ text, size: 22, color: P.body, font: FONT })],
  });
}
function note(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 120 },
    children: [new TextRun({ text, size: 19, italics: true, color: P.secondary, font: FONT })],
  });
}

const cellMargins = { top: 70, bottom: 70, left: 110, right: 110 };

function headerCell(text, widthPct) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: P.tableHeaderBg },
    margins: cellMargins,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, size: 19, color: P.tableHeaderText, font: FONT })],
    })],
  });
}

function checkTable(items) {
  const widths = [6, 34, 42, 18];
  const header = new TableRow({
    tableHeader: true, cantSplit: true,
    children: [
      headerCell("", widths[0]),
      headerCell("Fonctionnalité", widths[1]),
      headerCell("Observation / preuve dans le dépôt", widths[2]),
      headerCell("État", widths[3]),
    ],
  });
  const rows = items.map((it, idx) => {
    const st = STATUS[it.s] || STATUS.ACONFIRMER;
    const bg = idx % 2 === 0 ? P.surface : "FFFFFF";
    const mk = (children, w) => new TableCell({
      width: { size: w, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: bg },
      margins: cellMargins,
      verticalAlign: VerticalAlign.CENTER,
      children,
    });
    return new TableRow({
      cantSplit: true,
      children: [
        mk([new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "\u2610", size: 22, color: P.primary, font: FONT })],
        })], widths[0]),
        mk([new Paragraph({
          spacing: { line: 312 },
          children: [new TextRun({ text: it.f, size: 20, bold: false, color: P.body, font: FONT })],
        })], widths[1]),
        mk([new Paragraph({
          spacing: { line: 312 },
          children: [new TextRun({ text: it.d, size: 19, color: "444444", font: FONT })],
        })], widths[2]),
        mk([new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { line: 312 },
          children: [new TextRun({ text: st.label, size: 19, bold: true, color: st.color, font: FONT })],
        })], widths[3]),
      ],
    });
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: P.accent },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: P.accent },
      left: NB, right: NB,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.innerLine },
      insideVertical: NB,
    },
    rows: [header, ...rows],
  });
}

function tableTitle(text) {
  return new Paragraph({
    keepNext: true,
    spacing: { before: 120, after: 80 },
    children: [new TextRun({ text, size: 19, bold: true, color: P.secondary, font: FONT })],
  });
}

function pageNumFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "777777", font: FONT })],
    })],
  });
}
function docHeader() {
  return new Header({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.innerLine, space: 4 } },
      children: [new TextRun({ text: "Mon Toit CI — Checklist des fonctionnalités par acteur", size: 16, color: "999999", font: FONT })],
    })],
  });
}

// ------------------------------------------------------------- contenu
const bodyChildren = [];

// 1. Objet et mode d'emploi
bodyChildren.push(h1("1. Objet et mode d'emploi", { pageBreak: false }));
bodyChildren.push(body("Ce document constitue la checklist de recette fonctionnelle de la plateforme Mon Toit CI (branche 4.0.0). Il recense, pour chacun des six acteurs de l'écosystème — Visiteur, Locataire, Propriétaire, Agence, Tiers de confiance et Administrateur — l'ensemble des fonctionnalités attendues, assorties d'une case à cocher et d'un état d'implémentation constaté dans le dépôt."));
bodyChildren.push(body("Chaque ligne correspond à une capacité métier vérifiable en démonstration. La colonne « Observation / preuve dans le dépôt » cite l'écran, la route API ou la table qui matérialise la fonctionnalité, afin de permettre au recetteur de se repérer rapidement. La colonne « État » synthétise l'analyse statique du code (dossiers analyse-acteurs/, .ai/ACTORS.md et README de la branche 4.0.0), réalisée le 27 octobre 2026."));
bodyChildren.push(tableTitle("Légende des états"));
bodyChildren.push(new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  layout: TableLayoutType.FIXED,
  borders: {
    top: { style: BorderStyle.SINGLE, size: 4, color: P.accent },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: P.accent },
    left: NB, right: NB,
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.innerLine },
    insideVertical: NB,
  },
  rows: [
    new TableRow({
      tableHeader: true, cantSplit: true,
      children: [headerCell("État", 20), headerCell("Signification", 80)],
    }),
    ...[
      ["Existante", "Implémentée et reliée de bout en bout (interface + API + données).", "1B7A43"],
      ["Partielle", "Présente mais incomplète : non branchée dans l'UI, schéma à aligner, contrôles à durcir ou planification manquante.", "B45309"],
      ["Manquante", "Absente du code ou inaccessible depuis l'interface.", "B3261E"],
      ["À confirmer", "Écran et route présents ; le comportement réel en production n'est pas vérifiable par la seule lecture du dépôt.", "6B7280"],
    ].map(([label, desc, color], idx) => new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? P.surface : "FFFFFF" },
          margins: cellMargins, verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color, font: FONT })] })],
        }),
        new TableCell({
          width: { size: 80, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? P.surface : "FFFFFF" },
          margins: cellMargins, verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ spacing: { line: 312 }, children: [new TextRun({ text: desc, size: 20, color: P.body, font: FONT })] })],
        }),
      ],
    })),
  ],
}));
bodyChildren.push(body("Mode d'emploi : cocher la case de chaque fonctionnalité validée en séance de recette. Toute ligne « Partielle » ou « Manquante » doit faire l'objet d'un ticket de développement ; la synthèse des priorités en chapitre 10 propose un ordre de traitement (P0 bloquant, P1 important, P2 amélioration).", { after: 200 }));

// 2. Vue d'ensemble
bodyChildren.push(h1("2. Vue d'ensemble des acteurs"));
bodyChildren.push(body("Mon Toit CI relie six acteurs sur un écosystème unique : recherche de bien, qualification locative, signature électronique, encaissement mobile money, KYC et résolution de litiges. L'architecture s'appuie sur Next.js 16 (162 routes API), Supabase (85 migrations SQL, 49 tables, 25 Edge Functions), l'intégration Intouch pour les paiements et CRYPTONEO/ANSUT pour la signature. Environ 100 écrans de dashboard sont répartis par acteur dans une navigation SPA, complétée par une application mobile Capacitor."));
const totalItems = ACTORS.reduce((n, a) => n + a.categories.reduce((m, c) => m + c.items.length, 0), 0) + TRANSVERSE.length;
bodyChildren.push(tableTitle("Répartition des acteurs et périmètre de la checklist"));
bodyChildren.push(new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  layout: TableLayoutType.FIXED,
  borders: {
    top: { style: BorderStyle.SINGLE, size: 4, color: P.accent },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: P.accent },
    left: NB, right: NB,
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.innerLine },
    insideVertical: NB,
  },
  rows: [
    new TableRow({
      tableHeader: true, cantSplit: true,
      children: [headerCell("Acteur", 22), headerCell("Mission", 44), headerCell("Écrans dédiés", 20), headerCell("Lignes checklist", 14)],
    }),
    ...ACTORS.map((a, idx) => {
      const count = a.categories.reduce((m, c) => m + c.items.length, 0);
      const bg = idx % 2 === 0 ? P.surface : "FFFFFF";
      const mk = (text, w, bold = false) => new TableCell({
        width: { size: w, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: bg },
        margins: cellMargins, verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ spacing: { line: 312 }, children: [new TextRun({ text, size: 19, bold, color: P.body, font: FONT })] })],
      });
      return new TableRow({
        cantSplit: true,
        children: [mk(a.title.split(" (")[0], 22, true), mk(a.mission, 44), mk(a.screens, 20), mk(String(count), 14)],
      });
    }),
    (() => {
      const mk = (text, w, bold = false) => new TableCell({
        width: { size: w, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: P.surface },
        margins: cellMargins, verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ spacing: { line: 312 }, children: [new TextRun({ text, size: 19, bold, color: P.body, font: FONT })] })],
      });
      return new TableRow({
        cantSplit: true,
        children: [mk("Transverse", 22, true), mk("Services communs à tous les acteurs (auth, messagerie, paiements, signature, KYC, mobile, tests).", 44), mk("—", 20), mk(String(TRANSVERSE.length), 14)],
      });
    })(),
  ],
}));
bodyChildren.push(body("Le switch de rôle est restreint à Locataire ↔ Propriétaire via /api/user/switch-role. La matrice complète des permissions (acteur × action × ressource) est documentée dans .ai/ACTORS.md et constitue le référentiel d'autorisation côté middleware.", { after: 200 }));

// 3 à 8 : acteurs
ACTORS.forEach((actor, aIdx) => {
  const chapterNum = aIdx + 3;
  bodyChildren.push(h1(`${chapterNum}. ${actor.title}`));
  bodyChildren.push(body(actor.mission));
  bodyChildren.push(note(`Périmètre UI : ${actor.screens}.`));
  actor.categories.forEach((cat, cIdx) => {
    bodyChildren.push(h2(`${chapterNum}.${cIdx + 1} ${cat.title}`));
    bodyChildren.push(checkTable(cat.items));
  });
});

// 9. Transverse
bodyChildren.push(h1("9. Fonctionnalités transverses (tous acteurs)"));
bodyChildren.push(body("Les services ci-dessous sont mutualisés entre tous les acteurs : authentification, temps réel, notifications, paiements, signature, KYC, assistant IA, application mobile et outillage qualité. Leur bon fonctionnement conditionne la majorité des parcours décrits aux chapitres précédents."));
bodyChildren.push(checkTable(TRANSVERSE));

// 10. Synthèse des priorités
bodyChildren.push(h1("10. Synthèse des priorités et prochaines étapes"));
bodyChildren.push(body("La consolidation des lignes « Partielle » et « Manquante » de cette checklist aboutit au plan d'action suivant. Les priorités P0 correspondent aux constats bloquants pour la mise en production (sécurité, intégrité financière, contrats de données) ; les P1 complètent les parcours métier ; les P2 améliorent l'expérience et l'exploitation."));
bodyChildren.push(tableTitle("Plan d'action consolidé"));
bodyChildren.push(new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  layout: TableLayoutType.FIXED,
  borders: {
    top: { style: BorderStyle.SINGLE, size: 4, color: P.accent },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: P.accent },
    left: NB, right: NB,
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.innerLine },
    insideVertical: NB,
  },
  rows: [
    new TableRow({
      tableHeader: true, cantSplit: true,
      children: [headerCell("Prio.", 8), headerCell("Constat", 18), headerCell("Détail", 34), headerCell("Acteurs", 14), headerCell("Action recommandée", 26)],
    }),
    ...PRIORITIES.map((pr, idx) => {
      const bg = idx % 2 === 0 ? P.surface : "FFFFFF";
      const color = pr.p === "P0" ? "B3261E" : (pr.p === "P1" ? "B45309" : "6B7280");
      const mk = (text, w, opts = {}) => new TableCell({
        width: { size: w, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: bg },
        margins: cellMargins, verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          spacing: { line: 312 },
          alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({ text, size: 19, bold: !!opts.bold, color: opts.color || P.body, font: FONT })],
        })],
      });
      return new TableRow({
        cantSplit: true,
        children: [mk(pr.p, 8, { bold: true, color, center: true }), mk(pr.constat, 18, { bold: true }), mk(pr.detail, 34), mk(pr.acteurs, 14), mk(pr.action, 26)],
      });
    }),
  ],
}));
bodyChildren.push(body("Prochaines étapes suggérées : (1) traiter les cinq chantiers P0 avant toute mise en production ; (2) configurer le scheduler pg_cron des six Edge Functions planifiées avec le secret CRON_SECRET ; (3) dérouler cette checklist en séance de recette par acteur, en cochant les fonctionnalités démontrées ; (4) mettre à jour .ai/ACTORS.md et les analyses d'acteurs à chaque évolution du périmètre.", { after: 200 }));

// ------------------------------------------------------------ document
const pgSize = { width: 11906, height: 16838 };
const pgMargin = { top: 1440, bottom: 1440, left: 1701, right: 1417 };

const doc = new Document({
  creator: "Mon Toit CI",
  title: "Checklist des fonctionnalités par acteur — Mon Toit CI",
  description: "Checklist de recette fonctionnelle des six acteurs de la plateforme Mon Toit CI (branche 4.0.0)",
  styles: {
    default: {
      document: {
        run: { font: FONT, size: 22, color: P.body },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: FONT, size: 32, bold: true, color: P.primary },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 },
      },
      heading2: {
        run: { font: FONT, size: 26, bold: true, color: P.primary },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 },
      },
    },
  },
  sections: [
    // Section 1 : couverture — marges 0, pas de pied de page
    {
      properties: {
        page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } },
      },
      children: buildCoverR1({
        title: "Checklist des fonctionnalités par acteur",
        subtitle: "Recueil de validation fonctionnelle des six acteurs de la plateforme",
        englishLabel: "MON TOIT CI",
        metaLines: [
          "Branche 4.0.0 — Next.js 16 + Supabase",
          "Sources : analyse-acteurs/ · .ai/ACTORS.md · README",
          "Édition du 27 octobre 2026",
        ],
        footerLeft: "Mon Toit CI — Plateforme de gestion locative (Côte d'Ivoire)",
        footerRight: "Document de travail — usage interne",
        palette: COVER,
      }),
    },
    // Section 2 : table des matières — numérotation romaine
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      footers: { default: pageNumFooter() },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 360 },
          children: [new TextRun({ text: "Table des matières", bold: true, size: 32, color: P.primary, font: FONT })],
        }),
        new TableOfContents("Table des matières", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({
            text: "Remarque : cette table des matières est générée par codes de champ. Après toute modification, cliquez droit sur la table puis choisissez « Mettre à jour les champs » pour actualiser la pagination.",
            italics: true, size: 18, color: "888888", font: FONT,
          })],
        }),
      ],
    },
    // Section 3 : corps — numérotation arabe repartant de 1
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      headers: { default: docHeader() },
      footers: { default: pageNumFooter() },
      children: bodyChildren,
    },
  ],
});

const OUT = "/home/z/my-project/download/Checklist_Fonctionnalites_Acteurs_MonToitCI.docx";
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  const items = ACTORS.reduce((n, a) => n + a.categories.reduce((m, c) => m + c.items.length, 0), 0) + TRANSVERSE.length;
  console.log("OK ->", OUT, "|", items, "lignes de checklist");
});
