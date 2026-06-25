const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const projectRoot = path.resolve(__dirname, "..");
const htmlPath = path.join(projectRoot, "AI-Transportation-AtkinsRealis-Editable.html");
const outputPath = path.join(
  projectRoot,
  "AI in Transportation Planning and Engineering - AtkinsRealis Branded Editable.pptx"
);

const html = fs.readFileSync(htmlPath, "utf8");
const sourceMatch = html.match(
  /<script type="application\/json" id="deck-source-data">([\s\S]*?)<\/script>/
);
if (!sourceMatch) throw new Error("Embedded deck source data was not found in the HTML.");
const source = JSON.parse(sourceMatch[1]);
const sourceSlides = source.slides;
const imageBySlide = source.imageBySlide || {};

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "OpenAI Codex";
pptx.company = "AtkinsRéalis";
pptx.subject = "AI development, use cases, risks, governance, and future direction";
pptx.title = "AI in Transportation Planning and Engineering";
pptx.lang = "en-US";
pptx.theme = {
  headFontFace: "Arial",
  bodyFontFace: "Arial",
  lang: "en-US",
};
pptx.defineSlideMaster({
  title: "ATKINS_CONTENT",
  background: { color: "FFFFFF" },
  objects: [],
});

const C = {
  bg: "FFFFFF",
  white: "FFFFFF",
  navy: "182D38",
  primary: "182D38",
  blue: "3F32F1",
  teal: "05E560",
  yellow: "B9FF00",
  purple: "BE02F8",
  ink: "182D38",
  muted: "182D38",
  line: "BEDAE5",
  soft: "BEDAE5",
  pale: "BEDAE5",
  footer: "182D38",
};
const W = 13.333;
const H = 7.5;
const BRAND_LOGO_DARK = path.join(projectRoot, "assets", "atkinsrealis-logo-dark.png");
const BRAND_LOGO_LIGHT = path.join(projectRoot, "assets", "atkinsrealis-logo-light.png");

function addBrillianceDevice(slide) {
  [
    { x: 10.25, y: -3.2, w: 6.1, h: 6.1, color: C.blue, width: 10, transparency: 94 },
    { x: 10.85, y: -2.65, w: 5.0, h: 5.0, color: C.teal, width: 8, transparency: 95 },
    { x: 11.35, y: -2.15, w: 4.0, h: 4.0, color: C.line, width: 7, transparency: 88 },
  ].forEach((ring) => {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: ring.x,
      y: ring.y,
      w: ring.w,
      h: ring.h,
      fill: { color: C.white, transparency: 100 },
      line: {
        color: ring.color,
        width: ring.width,
        transparency: ring.transparency,
      },
    });
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0.82,
    w: 0.035,
    h: 0.72,
    fill: { color: C.blue },
    line: { color: C.blue, transparency: 100 },
  });
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u000b/g, "\n")
    .replace(/\u000c/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

function isFooter(text) {
  return normalizeText(text).startsWith("EXPANDED CONTENT DRAFT");
}

function slideParts(sourceSlide) {
  const texts = sourceSlide.content
    .filter((item) => item.type === "text")
    .map((item) => normalizeText(item.content))
    .filter(Boolean);
  return { title: texts[0] || `Slide ${sourceSlide.number}`, body: texts.slice(1) };
}

function splitInlineLabel(line) {
  if (/^https?:\/\//i.test(line)) return null;
  const match = line.match(/^([^:\n]{1,80}:)\s+(.+)$/);
  return match ? { label: match[1], value: match[2] } : null;
}

function lineKind(line) {
  if (/^https?:\/\//i.test(line)) return "url";
  if (/^•\s*/.test(line)) return "bullet";
  if (/^\d{4}\/\d{2}\s+[—-]/.test(line)) return "date";
  if (/^Source:\s+/i.test(line)) return "source-note";
  if (splitInlineLabel(line)) return "inline-label";
  if (
    /^(Main message|Key message|Key Message|Good uses|Good Use Cases|Limitations|Important limitation|Common causes|Better question|Simple Example|Example Questions|Why This Matters|Demo Link|Practical Benefit|Source Library|Practical Tips|Common Concerns|Practical Guardrails|Balanced Answer|Case \d+\s+[—-]|Practical takeaway for consultants|Industry-Specific Future|Final Message|Recommended Next Steps|What Still Needs Humans|Tasks AI Can Help Automate|Human-in-the-Loop Role|Consulting Opportunities|Future Trends|Important Distinction|Where AI Can Help|My View|Without AI$|In the .* mode|Research Agent|Data Agent|GIS Agent|Writing Agent|QA\/QC Agent|Human Lead|Human Lead as Project Manager|Agents as Specialized Team Members|Skills as Assigned Capabilities|Tools and Data as Work Resources|Escalation to Human|How RAG Works|Step \d+|User asks|The document may use|Source:|Tool:|Developer:|Access:)/i.test(
      line
    )
  )
    return "heading";
  if (line.endsWith(":") && line.length < 90) return "heading";
  return "paragraph";
}

function splitStructuredSections(text) {
  const lines = normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const sections = [];
  let current = [];
  for (const line of lines) {
    if (lineKind(line) === "heading" && current.length) {
      sections.push(current.join("\n"));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) sections.push(current.join("\n"));
  return sections;
}

function splitBulletBlock(text, groupCounts) {
  const lines = normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const preamble = [];
  const groups = [];
  let current = null;
  for (const line of lines) {
    if (/^•\s*/.test(line)) {
      if (current) groups.push(current);
      current = [line];
    } else if (current) {
      current.push(line);
    } else {
      preamble.push(line);
    }
  }
  if (current) groups.push(current);
  const chunks = [];
  let offset = 0;
  groupCounts.forEach((count, index) => {
    const chunk = groups.slice(offset, offset + count).flat();
    if (index === 0) chunk.unshift(...preamble);
    if (chunk.length) chunks.push(chunk.join("\n"));
    offset += count;
  });
  if (offset < groups.length) chunks.push(groups.slice(offset).flat().join("\n"));
  return chunks;
}

function cardTexts(body, slideNumber) {
  const raw = body.filter((text) => !isFooter(text));
  if (slideNumber === 14 && raw.length >= 3) {
    const practicalSections = splitStructuredSections(raw[1]);
    const practicalTips = splitBulletBlock(practicalSections[0] || raw[1], [4, 3]);
    const closingMessage = [...practicalSections.slice(1), raw[2]]
      .filter(Boolean)
      .join("\n");
    return [
      ...splitBulletBlock(raw[0], [3, 2, 2]),
      ...practicalTips,
      closingMessage,
    ];
  }
  if (slideNumber === 15) {
    const sections = raw.flatMap(splitStructuredSections);
    return sections.flatMap((section) =>
      /^Practical Guardrails/i.test(section)
        ? splitBulletBlock(section, [3, 3])
        : [section]
    );
  }
  if (slideNumber === 20 && raw.length === 1) {
    const lines = normalizeText(raw[0])
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    return lines.length > 1 ? [lines[0], ...lines.slice(1)] : raw;
  }
  if ([15, 23, 24].includes(slideNumber)) {
    return raw.flatMap(splitStructuredSections);
  }
  return raw;
}

function planningStages(body) {
  const raw = body.filter((text) => !isFooter(text));
  const firstLines = normalizeText(raw[0] || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const chatbotIndex = firstLines.findIndex((line) =>
    /^In the old chatbot mode/i.test(line)
  );
  return [
    {
      label: "NO AI",
      text: firstLines.slice(0, chatbotIndex < 0 ? firstLines.length : chatbotIndex).join("\n"),
    },
    {
      label: "AI Chatbox",
      text:
        chatbotIndex < 0
          ? ""
          : firstLines.slice(chatbotIndex).join("\n"),
    },
    {
      label: "AI Agent",
      text: normalizeText(raw[1] || ""),
    },
  ];
}

function richRuns(text, fontSize, compactSpacing = false) {
  const lines = normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const runs = [];
  lines.forEach((line, index) => {
    const kind = lineKind(line);
    const options = {
      breakLine: index < lines.length - 1,
      color: C.ink,
      fontFace: "Arial",
      fontSize,
      paraSpaceAfterPt: compactSpacing ? 0.5 : Math.max(1.5, fontSize * 0.18),
    };
    let textValue = line;
    if (kind === "inline-label") {
      const parts = splitInlineLabel(line);
      runs.push({
        text: parts.label,
        options: {
          ...options,
          breakLine: false,
          bold: true,
          color: C.primary,
        },
      });
      runs.push({
        text: ` ${parts.value}`,
        options,
      });
      return;
    } else if (kind === "source-note") {
      options.bold = false;
      options.color = C.muted;
    } else if (kind === "bullet") {
      textValue = line.replace(/^•\s*/, "");
      options.bullet = { indent: fontSize * 0.9 };
      options.hanging = fontSize * 0.25;
    } else if (kind === "heading") {
      options.bold = true;
      options.color = C.primary;
      options.fontFace = "Arial";
      options.fontSize = fontSize + 0.7;
      options.paraSpaceBeforePt = fontSize * 0.25;
    } else if (kind === "date") {
      options.bold = true;
      options.color = C.blue;
      options.fontFace = "Arial";
      options.fontSize = fontSize + 0.5;
    } else if (kind === "url") {
      options.color = C.blue;
      options.underline = { style: "sng" };
      options.hyperlink = { url: line };
      options.fontSize = Math.max(14, fontSize);
    }
    runs.push({ text: textValue, options });
  });
  return runs;
}

function addHeader(slide, title, number) {
  addBrillianceDevice(slide);
  slide.addImage({
    path: BRAND_LOGO_DARK,
    x: 0.35,
    y: 0.11,
    w: 1.68,
    h: 0.18,
    sizing: { type: "contain", w: 1.68, h: 0.18 },
    altText: "AtkinsRéalis",
  });
  slide.addText("AI IN TRANSPORTATION PLANNING & ENGINEERING", {
    x: 2.18,
    y: 0.14,
    w: 6.2,
    h: 0.15,
    margin: 0,
    fontFace: "Arial",
    fontSize: 7,
    bold: true,
    charSpacing: 1.4,
    color: C.navy,
  });
  const veryLong = title.length > 100;
  const titleSize = veryLong ? 25 : title.length > 80 ? 28 : title.length > 55 ? 30 : 32;
  const titleHeight = veryLong ? 1.0 : title.length > 55 || title.includes("\n") ? 0.82 : 0.68;
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.35,
    y: 0.43,
    w: 0.1,
    h: veryLong ? 0.84 : title.length > 55 || title.includes("\n") ? 0.68 : 0.52,
    fill: { color: C.blue },
    line: { color: C.blue, transparency: 100 },
  });
  slide.addText(title, {
    x: 0.57,
    y: veryLong ? 0.27 : 0.31,
    w: 11.83,
    h: titleHeight,
    margin: 0,
    fontFace: "Arial",
    fontSize: titleSize,
    bold: true,
    breakLine: false,
    color: C.navy,
    valign: "mid",
  });
  slide.addText(String(number).padStart(2, "0"), {
    x: 12.43,
    y: 0.14,
    w: 0.52,
    h: 0.2,
    margin: 0,
    fontFace: "Arial",
    fontSize: 8,
    bold: true,
    align: "right",
    color: C.blue,
  });
}

function addFooter(slide, body, number) {
  const footer = body.find(isFooter);
  slide.addText("ATKINSRÉALIS · AI IN TRANSPORTATION", {
    x: 0.35,
    y: 7.24,
    w: 3.0,
    h: 0.12,
    margin: 0,
    fontSize: 6.5,
    bold: true,
    charSpacing: 0.9,
    color: C.footer,
  });
  slide.addText(String(number).padStart(2, "0"), {
    x: 12.51,
    y: 7.24,
    w: 0.45,
    h: 0.12,
    margin: 0,
    fontSize: 6.5,
    bold: true,
    align: "right",
    color: C.footer,
  });
  if (footer) {
    slide.addText(footer, {
      x: 4.2,
      y: 7.22,
      w: 4.9,
      h: 0.14,
      margin: 0,
      fontFace: "Arial",
      fontSize: 5.7,
      align: "center",
      color: C.line,
      fit: "shrink",
    });
  }
}

function cardFontSize(text, columns = 2) {
  const len = normalizeText(text).length;
  if (len < 260) return 16;
  if (len < 520) return 15;
  return 14;
}

function addCard(
  slide,
  text,
  x,
  y,
  w,
  h,
  index = 0,
  columns = 2,
  fontSizeOverride = null,
  compactSpacing = false
) {
  const topColor = index === 0 ? C.blue : C.line;
  slide.addShape(pptx.ShapeType.line, {
    x,
    y,
    w,
    h: 0,
    line: { color: topColor, width: index === 0 ? 1.6 : 0.8 },
  });
  slide.addText(String(index + 1).padStart(2, "0"), {
    x: x + w - 0.38,
    y: y + 0.08,
    w: 0.36,
    h: 0.16,
    margin: 0,
    fontFace: "Arial",
    fontSize: 7,
    bold: true,
    align: "right",
    color: C.line,
  });
  slide.addText(
    richRuns(text, fontSizeOverride || cardFontSize(text, columns), compactSpacing),
    {
    x: x + 0.02,
    y: y + 0.23,
    w: w - 0.08,
    h: h - 0.27,
    margin: 0,
    valign: "top",
    breakLine: false,
    }
  );
}

function splitBottomSource(text) {
  const lines = normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const sourceIndex = lines.findIndex((line) => /^Source:\s+/i.test(line));
  if (sourceIndex < 0) return null;
  return {
    main: lines.filter((_, index) => index !== sourceIndex).join("\n"),
    source: lines[sourceIndex],
  };
}

function addCardWithBottomSource(
  slide,
  text,
  x,
  y,
  w,
  h,
  index = 0,
  columns = 3
) {
  const parts = splitBottomSource(text);
  if (!parts) {
    addCard(slide, text, x, y, w, h, index, columns);
    return;
  }
  const topColor = index === 0 ? C.blue : C.line;
  const fontSize = cardFontSize(text, columns);
  const sourceH = 1.12;
  slide.addShape(pptx.ShapeType.line, {
    x,
    y,
    w,
    h: 0,
    line: { color: topColor, width: index === 0 ? 1.6 : 0.8 },
  });
  slide.addText(richRuns(parts.main, fontSize), {
    x: x + 0.02,
    y: y + 0.23,
    w: w - 0.08,
    h: h - sourceH - 0.24,
    margin: 0,
    valign: "top",
    breakLine: false,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: x + 0.02,
    y: y + h - sourceH - 0.04,
    w: w - 0.08,
    h: 0,
    line: { color: C.line, width: 0.8 },
  });
  slide.addText(parts.source, {
    x: x + 0.02,
    y: y + h - sourceH + 0.07,
    w: w - 0.08,
    h: sourceH - 0.16,
    margin: 0,
    fontFace: "Arial",
    fontSize,
    bold: false,
    color: C.muted,
    valign: "bottom",
    fit: "shrink",
  });
}

function addImageFrame(slide, relativePath, x, y, w, h) {
  if (!relativePath) return;
  const imagePath = path.join(projectRoot, relativePath.replace(/\//g, path.sep));
  slide.addImage({
    path: imagePath,
    x,
    y,
    w,
    h,
    sizing: { type: "cover", w, h },
    altText: "Transportation planning and engineering professionals using AI-assisted workflows",
  });
}

function addCardGrid(slide, body, x, y, w, h, preferredColumns, slideNumber = 0) {
  const cards = cardTexts(body, slideNumber);
  const count = cards.length;
  if (!count) return;
  let cols = Math.min(preferredColumns || (count >= 3 ? 3 : 2), count);
  let rows = Math.ceil(count / cols);
  if (count === 4) {
    cols = 2;
    rows = 2;
  }
  const gap = 0.16;
  const cw = (w - gap * (cols - 1)) / cols;
  const ch = (h - gap * (rows - 1)) / rows;
  const weightedTwoCardRows = cols === 1 && count === 2;
  let rowHeights = null;
  if (weightedTwoCardRows) {
    const lengths = cards.map((text) => Math.max(1, normalizeText(text).length));
    const ratio = Math.min(0.68, Math.max(0.48, lengths[0] / (lengths[0] + lengths[1])));
    rowHeights = [(h - gap) * ratio, (h - gap) * (1 - ratio)];
  } else if (rows === 2) {
    const topLength = Math.max(
      ...cards.slice(0, cols).map((text) => normalizeText(text).length)
    );
    const bottomLength = Math.max(
      ...cards.slice(cols).map((text) => normalizeText(text).length)
    );
    const ratio = Math.min(
      0.62,
      Math.max(0.48, topLength / Math.max(1, topLength + bottomLength))
    );
    rowHeights = [(h - gap) * ratio, (h - gap) * (1 - ratio)];
  }
  cards.forEach((text, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cardY = rowHeights ? y + (row === 0 ? 0 : rowHeights[0] + gap) : y + row * (ch + gap);
    const cardH = rowHeights ? rowHeights[row] : ch;
    const cardX = x + col * (cw + gap);
    if (slideNumber === 16 && /^Case [12]\s+[—-]/i.test(normalizeText(text))) {
      addCardWithBottomSource(slide, text, cardX, cardY, cw, cardH, index, cols);
    } else {
      addCard(
        slide,
        text,
        cardX,
        cardY,
        cw,
        cardH,
        index,
        cols,
        slideNumber === 14 ? 14 : null
      );
    }
  });
}

function addConceptNode(slide, label, x, y, w, h, tone = "navy") {
  const accent = tone === "blue" ? C.blue : tone === "green" ? C.teal : C.navy;
  slide.addShape(pptx.ShapeType.line, {
    x,
    y: y + h,
    w,
    h: 0,
    line: { color: accent, width: tone === "navy" ? 0.8 : 1.8 },
  });
  slide.addText(label, {
    x,
    y: y + 0.02,
    w,
    h: h - 0.08,
    margin: 0,
    fontFace: "Arial",
    fontSize: 14,
    bold: true,
    align: "center",
    valign: "mid",
    color: C.navy,
    fit: "shrink",
  });
}

function addConceptArrow(slide, x, y, w, h, glyph = "→") {
  slide.addText(glyph, {
    x,
    y,
    w,
    h,
    margin: 0,
    fontFace: "Arial",
    fontSize: 18,
    bold: true,
    align: "center",
    valign: "mid",
    color: C.blue,
  });
}

function addConceptFlow(slide, labels, x, y, w, h, tones = [], glyph = "→") {
  const arrowW = 0.28;
  const nodeW = (w - arrowW * (labels.length - 1)) / labels.length;
  labels.forEach((label, index) => {
    const nodeX = x + index * (nodeW + arrowW);
    addConceptNode(slide, label, nodeX, y, nodeW, h, tones[index] || "navy");
    if (index < labels.length - 1) {
      addConceptArrow(slide, nodeX + nodeW, y, arrowW, h, glyph);
    }
  });
}

function addConceptVisual(slide, slideNumber, x, y, w, h) {
  slide.addShape(pptx.ShapeType.line, {
    x,
    y,
    w,
    line: { color: C.line, width: 0.8 },
    h: 0,
  });
  if (slideNumber === 6) {
    const gap = 0.18;
    const leftW = w * 0.34;
    addConceptFlow(
      slide,
      ["Chatbot", "Responds"],
      x + 0.12,
      y + 0.11,
      leftW - 0.18,
      h - 0.22,
      ["blue", "navy"]
    );
    addConceptFlow(
      slide,
      ["Agent", "Steps", "Tools + skills", "Workflow"],
      x + leftW + gap,
      y + 0.11,
      w - leftW - gap - 0.12,
      h - 0.22,
      ["green", "navy", "blue", "navy"]
    );
    return;
  }
  if (slideNumber === 10) {
    const nodeW = (w - 0.78) / 2;
    addConceptNode(slide, "Good uses", x + 0.12, y + 0.11, nodeW, h - 0.22, "blue");
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x + nodeW + 0.23,
      y: y + 0.12,
      w: 0.5,
      h: h - 0.24,
      fill: { color: C.navy },
      line: { color: C.navy, transparency: 100 },
    });
    slide.addText("+", {
      x: x + nodeW + 0.23,
      y: y + 0.12,
      w: 0.5,
      h: h - 0.24,
      margin: 0,
      fontSize: 18,
      bold: true,
      align: "center",
      valign: "mid",
      color: C.teal,
    });
    addConceptNode(
      slide,
      "Professional judgment",
      x + nodeW + 0.66,
      y + 0.11,
      nodeW,
      h - 0.22,
      "green"
    );
    return;
  }
  if (slideNumber === 11) {
    addConceptFlow(
      slide,
      ["Prompt", "Most likely response", "Verify the source", "Human professional"],
      x + 0.12,
      y + 0.11,
      w - 0.24,
      h - 0.22,
      ["blue", "navy", "green", "navy"]
    );
    return;
  }
  if (slideNumber === 12) {
    addConceptFlow(
      slide,
      ["Documents", "Retrieve", "Generate", "Answer"],
      x + 0.12,
      y + 0.11,
      w - 0.24,
      h - 0.22,
      ["blue", "navy", "green", "navy"]
    );
    return;
  }
  if (slideNumber === 13) {
    slide.addText("23", {
      x: x + 0.18,
      y: y + 0.06,
      w: 1.05,
      h: h - 0.12,
      margin: 0,
      fontFace: "Arial",
      fontSize: 34,
      bold: true,
      align: "center",
      valign: "mid",
      color: C.blue,
    });
    slide.addText("State DOT resilience-related PDF documents", {
      x: x + 1.35,
      y: y + 0.08,
      w: w - 3.2,
      h: h - 0.16,
      margin: 0,
      fontFace: "Arial",
      fontSize: 16,
      bold: true,
      valign: "mid",
      color: C.navy,
    });
    [0.18, 0.09, 0].forEach((offset, index) => {
      slide.addShape(pptx.ShapeType.rect, {
        x: x + w - 1.45 - offset,
        y: y + 0.18 + offset,
        w: 1.05,
        h: h - 0.36,
        fill: { color: C.white },
        line: { color: C.blue, width: index === 2 ? 1.4 : 0.8, transparency: index * 20 },
      });
    });
    return;
  }
  if (slideNumber === 23) {
    addConceptFlow(
      slide,
      ["Tasks AI can help automate", "Human-in-the-loop", "What still needs humans"],
      x + 0.12,
      y + 0.11,
      w - 0.24,
      h - 0.22,
      ["blue", "green", "navy"]
    );
    return;
  }
  if (slideNumber === 24) {
    addConceptFlow(
      slide,
      ["Faster work", "Higher-value advisory tasks", "Future trends"],
      x + 0.08,
      y + 0.08,
      w - 0.16,
      h - 0.16,
      ["blue", "green", "navy"],
      "↗"
    );
  }
}

function addRoleOrbit(slide) {
  const x = 8.73;
  const y = 4.66;
  const w = 4.05;
  const h = 1.92;
  addConceptNode(slide, "Human Lead", x + 1.35, y + 0.12, 1.35, 0.5, "green");
  const nodes = [
    ["Agents", x + 0.2, y + 0.76, 1.05],
    ["Skills", x + 1.5, y + 0.76, 1.05],
    ["Tools + data", x + 2.8, y + 0.76, 1.05],
    ["QA/QC", x + 0.72, y + 1.35, 1.15],
    ["Escalation", x + 2.17, y + 1.35, 1.15],
  ];
  nodes.forEach(([label, nodeX, nodeY, nodeW], index) => {
    const centerX = x + 2.02;
    const centerY = y + 0.62;
    const targetX = nodeX;
    const targetY = nodeY + 0.28;
    slide.addShape(pptx.ShapeType.line, {
      x: Math.min(centerX, targetX),
      y: Math.min(centerY, targetY),
      w: Math.abs(targetX - centerX),
      h: Math.abs(targetY - centerY),
      line: { color: C.line, width: 0.8 },
    });
    addConceptNode(
      slide,
      label,
      nodeX,
      nodeY,
      nodeW,
      0.55,
      index === 3 ? "green" : index === 2 ? "blue" : "navy"
    );
  });
}

function parseAgenda(text) {
  const lines = normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const entries = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].endsWith("?")) {
      entries.push({ question: lines[i], detail: lines[i + 1] || "" });
      i += 1;
    }
  }
  return entries;
}

function parseTimeline(body) {
  const all = body
    .filter((text) => !isFooter(text))
    .join("\n")
    .split(/\n|\u000b/)
    .map((line) => line.trim())
    .filter(Boolean);
  const intro = [];
  const entries = [];
  let current = null;
  for (const line of all) {
    if (/^\d{4}\/\d{2}\s+[—-]/.test(line)) {
      if (current) entries.push(current);
      current = { date: line, detail: [] };
    } else if (/^Fun fact\s*\/\s*current event:/i.test(line)) {
      if (current) entries.push(current);
      current = { date: line, detail: [] };
    } else if (current) current.detail.push(line);
    else intro.push(line);
  }
  if (current) entries.push(current);
  return { intro, entries };
}

function parseRoles(body) {
  const allLines = body
    .filter((text) => !isFooter(text))
    .join("\n")
    .split(/\n|\u000b/)
    .map((line) => line.trim())
    .filter(Boolean);
  const intro = [];
  const roles = [];
  let current = null;
  for (const line of allLines) {
    const match = line.match(
      /^(Research Agent|Data Agent|GIS Agent|Writing Agent|QA\/QC Agent|Human Lead|Human Lead as Project Manager|Agents as Specialized Team Members|Skills as Assigned Capabilities|Tools and Data as Work Resources|Escalation to Human)\s*:?\s*(.*)$/i
    );
    if (match) {
      if (current) roles.push(current);
      current = {
        heading: match[1] + (line.includes(":") ? ":" : ""),
        detail: match[2] ? [match[2]] : [],
      };
    } else if (current) current.detail.push(line);
    else intro.push(line);
  }
  if (current) roles.push(current);
  return { intro, roles };
}

function renderCover(sourceSlide, title, body) {
  const slide = pptx.addSlide();
  slide.background = { color: C.navy };
  const imagePath = imageBySlide[sourceSlide.number];
  if (imagePath) {
    const fullImagePath = path.join(projectRoot, imagePath.replace(/\//g, path.sep));
    slide.addImage({
      path: fullImagePath,
      x: 0,
      y: 0,
      w: W,
      h: H,
      sizing: { type: "cover", w: W, h: H },
      altText: "Transportation planners and engineers using AI-assisted regional resilience dashboards",
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 7.15,
      h: 7.5,
      fill: { color: C.navy, transparency: 8 },
      line: { color: C.navy, transparency: 100 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 7.15,
      y: 0,
      w: 1.1,
      h: 7.5,
      fill: { color: C.navy, transparency: 58 },
      line: { color: C.navy, transparency: 100 },
    });
  }
  slide.addImage({
    path: BRAND_LOGO_LIGHT,
    x: 0.65,
    y: 0.52,
    w: 2.2,
    h: 0.28,
    sizing: { type: "contain", w: 2.2, h: 0.28 },
    altText: "AtkinsRéalis",
  });
  slide.addText(title, {
    x: 0.65,
    y: 1.55,
    w: 6.4,
    h: 2.35,
    margin: 0,
    fontFace: "Arial",
    fontSize: 34,
    bold: true,
    color: C.white,
    valign: "mid",
  });
  const subtitle = body.filter((text) => !isFooter(text))[0] || "";
  slide.addText(subtitle, {
    x: 0.65,
    y: 4.05,
    w: 6.25,
    h: 1.15,
    margin: 0,
    fontFace: "Arial",
    fontSize: 18,
    color: C.line,
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.65,
    y: 5.55,
    w: 0.22,
    h: 0.09,
    fill: { color: C.blue },
    line: { color: C.blue, transparency: 100 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.93,
    y: 5.55,
    w: 0.22,
    h: 0.09,
    fill: { color: C.teal },
    line: { color: C.teal, transparency: 100 },
  });
  slide.addText("TRANSPORTATION PLANNING · ENGINEERING · GIS · PROJECT DELIVERY", {
    x: 0.65,
    y: 5.75,
    w: 6.1,
    h: 0.22,
    margin: 0,
    fontFace: "Arial",
    fontSize: 10,
    bold: true,
    charSpacing: 1.2,
    color: C.teal,
  });
  slide.addNotes(sourceSlide.notes || "");
}

function renderAgendaSlide(sourceSlide, title, body) {
  const slide = pptx.addSlide({ masterName: "ATKINS_CONTENT" });
  addHeader(slide, title, sourceSlide.number);
  const entries = parseAgenda(body.find((text) => !isFooter(text)) || "");
  const x = 0.35;
  const y = 1.18;
  const w = 8.65;
  const h = 5.83;
  const gap = 0.11;
  const cols = 2;
  const rows = 3;
  const cw = (w - gap) / cols;
  const ch = (h - gap * (rows - 1)) / rows;
  entries.forEach((entry, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cx = x + col * (cw + gap);
    const cy = y + row * (ch + gap);
    const agendaAccent = index < 2 ? C.blue : C.line;
    slide.addShape(pptx.ShapeType.line, {
      x: cx,
      y: cy,
      w: cw,
      h: 0,
      line: { color: agendaAccent, width: index < 2 ? 1.6 : 0.8 },
    });
    slide.addText(String(index + 1).padStart(2, "0"), {
      x: cx,
      y: cy + 0.14,
      w: 0.54,
      h: 0.35,
      margin: 0,
      fontFace: "Arial",
      fontSize: 23,
      bold: true,
      color: agendaAccent,
    });
    slide.addText(entry.question, {
      x: cx + 0.7,
      y: cy + 0.12,
      w: cw - 0.7,
      h: 0.48,
      margin: 0,
      fontFace: "Arial",
      fontSize: 15,
      bold: true,
      color: C.navy,
    });
    slide.addText(entry.detail, {
      x: cx + 0.7,
      y: cy + 0.58,
      w: cw - 0.7,
      h: ch - 0.66,
      margin: 0,
      fontSize: 14,
      color: C.muted,
      valign: "top",
    });
  });
  addImageFrame(slide, imageBySlide[sourceSlide.number], 9.13, 1.18, 3.85, 5.83, "");
  const finalText = body.filter((text) => !isFooter(text)).slice(1).join("\n");
  if (finalText) {
    slide.addShape(pptx.ShapeType.rect, {
      x: 9.13,
      y: 6.18,
      w: 3.85,
      h: 0.66,
      line: { color: C.navy, transparency: 100 },
      fill: { color: C.navy, transparency: 16 },
    });
    slide.addText(finalText, {
      x: 9.32,
      y: 6.31,
      w: 3.46,
      h: 0.36,
      margin: 0,
      color: C.white,
      fontSize: 11,
      italic: true,
      fit: "shrink",
    });
  }
  addFooter(slide, body, sourceSlide.number);
  slide.addNotes(sourceSlide.notes || "");
}

function renderTimelineSlide(sourceSlide, title, body) {
  const slide = pptx.addSlide({ masterName: "ATKINS_CONTENT" });
  addHeader(slide, title, sourceSlide.number);
  const { intro, entries } = parseTimeline(body);
  const hasIntro = intro.length > 0;
  if (hasIntro) {
    slide.addShape(pptx.ShapeType.line, {
      x: 0.35,
      y: 1.18,
      w: 0,
      h: 0.68,
      line: { color: C.blue, width: 1.6 },
    });
    slide.addText(richRuns(intro.join("\n"), 14), {
      x: 0.54,
      y: 1.28,
      w: 12.22,
      h: 0.62,
      margin: 0,
    });
  }
  const x = 0.35;
  const y = hasIntro ? 2.12 : 1.28;
  const w = 12.63;
  const h = hasIntro ? 4.89 : 5.73;
  if (sourceSlide.number === 5 && entries.length === 6) {
    const gap = 0.12;
    const topH = h * 0.4;
    const bottomH = h - topH - gap;
    const topW = (w - gap * 2) / 3;
    entries.slice(0, 3).forEach((entry, index) => {
      addCard(
        slide,
        `${entry.date}\n${entry.detail.join("\n")}`,
        x + index * (topW + gap),
        y,
        topW,
        topH,
        index,
        3
      );
    });
    const usableBottomW = w - gap * 2;
    const bottomWidths = [
      usableBottomW * 0.24,
      usableBottomW * 0.31,
      usableBottomW * 0.45,
    ];
    let bottomX = x;
    entries.slice(3).forEach((entry, offset) => {
      addCard(
        slide,
        `${entry.date}\n${entry.detail.join("\n")}`,
        bottomX,
        y + topH + gap,
        bottomWidths[offset],
        bottomH,
        offset + 3,
        offset === 2 ? 2 : 3
      );
      bottomX += bottomWidths[offset] + gap;
    });
    addFooter(slide, body, sourceSlide.number);
    slide.addNotes(sourceSlide.notes || "");
    return;
  }
  const cols = entries.length > 6 ? 4 : 3;
  const rows = 2;
  const gap = 0.12;
  const cw = (w - gap * (cols - 1)) / cols;
  const ch = (h - gap) / rows;
  entries.forEach((entry, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const text = `${entry.date}\n${entry.detail.join("\n")}`;
    addCard(slide, text, x + col * (cw + gap), y + row * (ch + gap), cw, ch, index, 3);
  });
  addFooter(slide, body, sourceSlide.number);
  slide.addNotes(sourceSlide.notes || "");
}

function renderRoleSlide(sourceSlide, title, body) {
  const slide = pptx.addSlide({ masterName: "ATKINS_CONTENT" });
  addHeader(slide, title, sourceSlide.number);
  const { intro, roles } = parseRoles(body);
  const hasImage = !!imageBySlide[sourceSlide.number] && sourceSlide.number !== 9;
  const textW = hasImage ? 8.75 : 12.63;
  const hasIntro = intro.length > 0;
  if (hasIntro) {
    slide.addShape(pptx.ShapeType.line, {
      x: 0.35,
      y: 1.18,
      w: 0,
      h: 0.64,
      line: { color: C.teal, width: 1.6 },
    });
    slide.addText(richRuns(intro.join("\n"), 14), {
      x: 0.54,
      y: 1.31,
      w: textW - 0.36,
      h: 0.5,
      margin: 0,
    });
  }
  const x = 0.35;
  const y = hasIntro ? 2.06 : 1.28;
  const h = hasIntro ? 4.95 : 5.73;
  const gap = 0.1;
  const ch = (h - gap) / 2;
  if (sourceSlide.number === 8 && roles.length === 6) {
    const topW = (textW - gap * 2) / 3;
    roles.slice(0, 3).forEach((role, index) => {
      addCard(
        slide,
        `${role.heading}\n${role.detail.join("\n")}`,
        x + index * (topW + gap),
        y,
        topW,
        ch,
        index,
        3
      );
    });
    const bottomWidths = [
      (textW - gap * 2) * 0.42,
      (textW - gap * 2) * 0.25,
      (textW - gap * 2) * 0.33,
    ];
    let bottomX = x;
    roles.slice(3).forEach((role, offset) => {
      addCard(
        slide,
        `${role.heading}\n${role.detail.join("\n")}`,
        bottomX,
        y + ch + gap,
        bottomWidths[offset],
        ch,
        offset + 3,
        offset === 0 ? 2 : 4
      );
      bottomX += bottomWidths[offset] + gap;
    });
  } else {
    const cols = 3;
    const cw = (textW - gap * (cols - 1)) / cols;
    roles.forEach((role, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      addCard(
        slide,
        `${role.heading}\n${role.detail.join("\n")}`,
        x + col * (cw + gap),
        y + row * (ch + gap),
        cw,
        ch,
        index,
        3
      );
    });
  }
  if (sourceSlide.number === 9) addRoleOrbit(slide);
  if (hasImage) addImageFrame(slide, imageBySlide[sourceSlide.number], 9.22, 1.18, 3.76, 5.83);
  addFooter(slide, body, sourceSlide.number);
  slide.addNotes(sourceSlide.notes || "");
}

function sourceEntries(body) {
  const entries = [];
  for (const block of body.filter((text) => !isFooter(text))) {
    const lines = normalizeText(block)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    for (let i = 0; i < lines.length; i += 1) {
      if (/^https?:\/\//i.test(lines[i])) continue;
      const next = lines[i + 1] && /^https?:\/\//i.test(lines[i + 1]) ? lines[++i] : "";
      entries.push(next ? `${lines[i - 1]}\n${next}` : lines[i]);
    }
  }
  return entries;
}

function renderSourceSlide(sourceSlide, title, body) {
  const slide = pptx.addSlide({ masterName: "ATKINS_CONTENT" });
  addHeader(slide, title, sourceSlide.number);
  const entries = sourceEntries(body);
  const columns = [[], [], []];
  const targetLength = entries.reduce((sum, entry) => sum + entry.length, 0) / columns.length;
  let columnIndex = 0;
  let columnLength = 0;
  entries.forEach((entry, index) => {
    const remainingEntries = entries.length - index;
    const remainingColumns = columns.length - columnIndex;
    if (
      columnIndex < columns.length - 1 &&
      columnLength > 0 &&
      columnLength + entry.length > targetLength &&
      remainingEntries >= remainingColumns
    ) {
      columnIndex += 1;
      columnLength = 0;
    }
    columns[columnIndex].push(entry);
    columnLength += entry.length;
  });
  const gap = 0.12;
  const x = 0.35;
  const y = 1.18;
  const w = (12.63 - gap * 2) / 3;
  const h = 5.95;
  columns.forEach((items, index) => {
    addCard(
      slide,
      items.join("\n"),
      x + index * (w + gap),
      y,
      w,
      h,
      index,
      3,
      14,
      true
    );
  });
  addFooter(slide, body, sourceSlide.number);
  slide.addNotes(sourceSlide.notes || "");
}

function renderImageSplitSlide(sourceSlide, title, body) {
  const slide = pptx.addSlide({ masterName: "ATKINS_CONTENT" });
  addHeader(slide, title, sourceSlide.number);
  const preferredColumns = sourceSlide.number === 24 ? 2 : 1;
  addCardGrid(
    slide,
    body,
    0.35,
    1.18,
    8.15,
    5.83,
    preferredColumns,
    sourceSlide.number
  );
  addImageFrame(slide, imageBySlide[sourceSlide.number], 8.63, 1.18, 4.35, 5.83);
  addFooter(slide, body, sourceSlide.number);
  slide.addNotes(sourceSlide.notes || "");
}

function addStageCard(slide, stage, x, y, w, h, index) {
  const headerColor = index === 0 ? C.navy : index === 1 ? C.blue : C.teal;
  if (index === 2) {
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w,
      h,
      fill: { color: C.teal, transparency: 92 },
      line: { color: C.teal, transparency: 100 },
    });
  }
  slide.addShape(pptx.ShapeType.line, {
    x,
    y,
    w,
    h: 0,
    line: { color: headerColor, width: index === 2 ? 2.0 : 1.0 },
  });
  slide.addText(String(index + 1).padStart(2, "0"), {
    x,
    y: y + 0.14,
    w: 0.34,
    h: 0.2,
    margin: 0,
    fontFace: "Arial",
    fontSize: 9,
    bold: true,
    color: C.line,
    transparency: 32,
  });
  slide.addText(stage.label, {
    x: x + 0.42,
    y: y + 0.08,
    w: w - 0.62,
    h: 0.36,
    margin: 0,
    fontFace: "Arial",
    fontSize: 20,
    bold: true,
    color: index === 1 ? C.blue : C.navy,
  });
  slide.addText(richRuns(stage.text, 14, true), {
    x: x + (index === 2 ? 0.14 : 0.02),
    y: y + 0.66,
    w: w - (index === 2 ? 0.28 : 0.08),
    h: h - 0.72,
    margin: 0,
    valign: "top",
    breakLine: false,
    fit: "shrink",
  });
}

function renderStageSlide(sourceSlide, title, body) {
  const slide = pptx.addSlide({ masterName: "ATKINS_CONTENT" });
  addHeader(slide, title, sourceSlide.number);
  const stages = planningStages(body);
  const x = 0.35;
  const y = 1.42;
  const h = 5.59;
  const gap = 0.28;
  const arrowW = 0.24;
  const available = 12.63 - gap * 4 - arrowW * 2;
  const weights = [0.82, 1.0, 1.28];
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const widths = weights.map((weight) => (available * weight) / totalWeight);
  let cursor = x;
  stages.forEach((stage, index) => {
    addStageCard(slide, stage, cursor, y, widths[index], h, index);
    cursor += widths[index];
    if (index < stages.length - 1) {
      cursor += gap;
      addConceptArrow(slide, cursor, y + h / 2 - 0.2, arrowW, 0.4);
      cursor += arrowW + gap;
    }
  });
  addFooter(slide, body, sourceSlide.number);
  slide.addNotes(sourceSlide.notes || "");
}

function renderGenericSlide(sourceSlide, title, body) {
  const slide = pptx.addSlide({ masterName: "ATKINS_CONTENT" });
  addHeader(slide, title, sourceSlide.number);
  const cards = cardTexts(body, sourceSlide.number);
  const preferred = cards.length >= 3 ? 3 : 2;
  const standardConceptSlides = [6, 10, 11, 12, 13, 23];
  const hasConceptBand = standardConceptSlides.includes(sourceSlide.number);
  const contentY = sourceSlide.number === 13 ? 1.42 : 1.18;
  const contentH = sourceSlide.number === 13 ? 5.59 : 5.83;
  const conceptH = sourceSlide.number === 13 ? 0.92 : sourceSlide.number === 23 ? 0.72 : 0.78;
  const conceptGap = 0.16;
  const gridH = hasConceptBand ? contentH - conceptH - conceptGap : contentH;
  addCardGrid(
    slide,
    body,
    0.35,
    contentY,
    12.63,
    gridH,
    preferred,
    sourceSlide.number
  );
  if (hasConceptBand) {
    addConceptVisual(
      slide,
      sourceSlide.number,
      0.35,
      contentY + gridH + conceptGap,
      12.63,
      conceptH
    );
  } else if (sourceSlide.number === 24) {
    addConceptVisual(slide, 24, 0.58, 3.06, 5.72, 0.66);
  }
  addFooter(slide, body, sourceSlide.number);
  slide.addNotes(sourceSlide.notes || "");
}

for (const sourceSlide of sourceSlides) {
  const { title, body } = slideParts(sourceSlide);
  if (sourceSlide.number === 1) renderCover(sourceSlide, title, body);
  else if (sourceSlide.number === 2) renderAgendaSlide(sourceSlide, title, body);
  else if ([4, 5].includes(sourceSlide.number)) renderTimelineSlide(sourceSlide, title, body);
  else if (sourceSlide.number === 7) renderStageSlide(sourceSlide, title, body);
  else if ([8, 9].includes(sourceSlide.number)) renderRoleSlide(sourceSlide, title, body);
  else if (sourceSlide.number === 21) renderSourceSlide(sourceSlide, title, body);
  else if ([3, 22, 25].includes(sourceSlide.number))
    renderImageSplitSlide(sourceSlide, title, body);
  else renderGenericSlide(sourceSlide, title, body);
}

pptx.writeFile({ fileName: outputPath, compression: true }).then(() => {
  console.log(`Wrote ${sourceSlides.length} editable slides to ${outputPath}`);
});
