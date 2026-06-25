const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(projectRoot, "source", "source-deck.json");
const templatePath =
  "C:\\Users\\xings\\.codex\\skills\\frontend-slides-editable\\examples\\generated\\presets\\blue-professional.html";
const outputPath = path.join(projectRoot, "AI-Transportation-AtkinsRealis-Editable.html");

const sourceSlides = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
let template = fs.readFileSync(templatePath, "utf8");

const IMAGE_BY_SLIDE = {
  1: "assets/illustrations/atkinsrealis-hero-16x9.png",
  2: "assets/illustrations/atkinsrealis-portrait-9x16.png",
  3: "assets/illustrations/atkinsrealis-portrait-9x16.png",
  7: "assets/illustrations/atkinsrealis-portrait-9x16.png",
  9: "assets/illustrations/digital-twin.png",
  13: "assets/illustrations/coastal-map.png",
  22: "assets/illustrations/atkinsrealis-portrait-9x16.png",
  24: "assets/illustrations/scenario-city.png",
  25: "assets/illustrations/atkinsrealis-portrait-9x16.png",
};

function normalizeText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u000b/g, "\n")
    .replace(/\u000c/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(value) {
  return esc(value).replace(/\n/g, " ");
}

function slotAttrs(id, label, type = "text") {
  return `data-edit-slot="${id}" data-slot-type="${type}" data-slot-label="${escAttr(
    String(label).slice(0, 90)
  )}" data-slot-locked-layout="true"`;
}

function titleHtml(text, slideIndex) {
  const safe = esc(normalizeText(text)).replace(/\n/g, "<br>");
  return `<h1 class="mck-title" ${slotAttrs(
    `s${slideIndex}-title`,
    normalizeText(text)
  )}>${safe}</h1>`;
}

function isFooter(text) {
  return normalizeText(text).startsWith("EXPANDED CONTENT DRAFT");
}

function bodyBlocks(slide) {
  const texts = slide.content
    .filter((item) => item.type === "text")
    .map((item) => normalizeText(item.content))
    .filter(Boolean);
  return {
    title: texts[0] || `Slide ${slide.number}`,
    body: texts.slice(1),
  };
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

function renderStructured(text, prefix) {
  const lines = normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  let html = "";
  let listOpen = false;
  let counter = 0;
  const closeList = () => {
    if (listOpen) {
      html += "</ul>";
      listOpen = false;
    }
  };
  for (const line of lines) {
    const kind = lineKind(line);
    const id = `${prefix}-${counter++}`;
    if (kind === "bullet") {
      if (!listOpen) {
        html += '<ul class="mck-list">';
        listOpen = true;
      }
      const visible = line.replace(/^•\s*/, "");
      html += `<li ${slotAttrs(id, visible)}>${esc(visible)}</li>`;
      continue;
    }
    closeList();
    if (kind === "url") {
      html += `<a class="mck-url" href="${escAttr(line)}" ${slotAttrs(
        id,
        line
      )}>${esc(line)}</a>`;
    } else if (kind === "source-note") {
      html += `<p class="mck-copy mck-source-note" ${slotAttrs(
        id,
        line
      )}>${esc(line)}</p>`;
    } else if (kind === "inline-label") {
      const parts = splitInlineLabel(line);
      html += `<p class="mck-copy mck-inline-label" ${slotAttrs(
        id,
        line
      )}><strong>${esc(parts.label)}</strong> ${esc(parts.value)}</p>`;
    } else if (kind === "heading") {
      html += `<h3 class="mck-subhead" ${slotAttrs(id, line)}>${esc(line)}</h3>`;
    } else if (kind === "date") {
      html += `<p class="mck-date" ${slotAttrs(id, line)}>${esc(line)}</p>`;
    } else {
      html += `<p class="mck-copy" ${slotAttrs(id, line)}>${esc(line)}</p>`;
    }
  }
  closeList();
  return html;
}

function densityClass(body) {
  const count = body.filter((text) => !isFooter(text)).join("\n").length;
  if (count > 1800) return "density-micro";
  if (count > 1400) return "density-compact";
  if (count > 950) return "density-dense";
  return "density-normal";
}

function imagePanel(slideNumber, slideIndex, position = "right") {
  const image = IMAGE_BY_SLIDE[slideNumber];
  if (!image) return "";
  return `<figure class="mck-image-panel mck-image-${position}" ${slotAttrs(
    `s${slideIndex}-image`,
    `Transportation AI illustration for slide ${slideNumber}`,
    "image"
  )}><img src="${image}" alt="Transportation planning and engineering professionals using AI-assisted workflows"></figure>`;
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

function renderPlanningStages(body, slideIndex) {
  return `<div class="mck-stage-grid">${planningStages(body)
    .map(
      (stage, index) => `<article class="mck-stage-card stage-${index + 1}">
        <div class="mck-stage-label" ${slotAttrs(
          `s${slideIndex}-stage-${index}`,
          stage.label
        )}><span>${String(index + 1).padStart(2, "0")}</span>${esc(stage.label)}</div>
        <div class="mck-stage-body">${renderStructured(
          stage.text,
          `s${slideIndex}-stage-body-${index}`
        )}</div>
      </article>`
    )
    .join('<div class="mck-stage-arrow">→</div>')}</div>`;
}

function renderCards(body, slideIndex, columns = 2, slideNumber = 0) {
  const cards = cardTexts(body, slideNumber);
  return `<div class="mck-card-grid cols-${columns}">${cards
    .map(
      (text, index) =>
        `<article class="mck-card">${renderStructured(
          text,
          `s${slideIndex}-b${index}`
        )}</article>`
    )
    .join("")}</div>`;
}

function renderAgenda(text, slideIndex) {
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
  return `<div class="mck-agenda">${entries
    .map(
      (entry, index) => `<article class="mck-agenda-item">
        <span class="mck-agenda-num">${String(index + 1).padStart(2, "0")}</span>
        <div><h3 ${slotAttrs(
          `s${slideIndex}-q${index}`,
          entry.question
        )}>${esc(entry.question)}</h3><p ${slotAttrs(
          `s${slideIndex}-qd${index}`,
          entry.detail
        )}>${esc(entry.detail)}</p></div>
      </article>`
    )
    .join("")}</div>`;
}

function renderTimeline(body, slideIndex, slideNumber) {
  const all = body
    .filter((text) => !isFooter(text))
    .map(normalizeText)
    .join("\n")
    .split("\n")
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
    } else if (current) {
      current.detail.push(line);
    } else {
      intro.push(line);
    }
  }
  if (current) entries.push(current);
  const introHtml = intro.length
    ? `<div class="mck-timeline-intro">${renderStructured(
        intro.join("\n"),
        `s${slideIndex}-intro`
      )}</div>`
    : "";
  return `${introHtml}<div class="mck-timeline ${
    slideNumber === 5 ? "mck-timeline-slide-5" : ""
  } ${
    entries.length > 6 ? "mck-timeline-cols-4" : ""
  }">${entries
    .map(
      (entry, index) => `<article class="mck-timeline-card">
        <p class="mck-date" ${slotAttrs(
          `s${slideIndex}-d${index}`,
          entry.date
        )}>${esc(entry.date)}</p>
        ${renderStructured(entry.detail.join("\n"), `s${slideIndex}-t${index}`)}
      </article>`
    )
    .join("")}</div>`;
}

function renderRoleGrid(body, slideIndex) {
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
    } else if (current) {
      current.detail.push(line);
    } else {
      intro.push(line);
    }
  }
  if (current) roles.push(current);
  const leadHtml = intro.length
    ? `<div class="mck-lead">${renderStructured(
        intro.join("\n"),
        `s${slideIndex}-lead`
      )}</div>`
    : "";
  return `${leadHtml}<div class="mck-role-grid ${
    slideIndex === 7 ? "mck-role-grid-slide-8" : ""
  }">${roles
    .map(
      (role, index) => `<article class="mck-role-card">
      <span class="mck-role-index">${String(index + 1).padStart(2, "0")}</span>
      <h3 ${slotAttrs(
        `s${slideIndex}-rh${index}`,
        role.heading
      )}>${esc(role.heading)}</h3>
      ${renderStructured(role.detail.join("\n"), `s${slideIndex}-rd${index}`)}
    </article>`
    )
    .join("")}</div>`;
}

function renderSources(body, slideIndex) {
  const entries = [];
  for (const block of body.filter((text) => !isFooter(text))) {
    const lines = normalizeText(block)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    for (let i = 0; i < lines.length; i += 1) {
      if (/^https?:\/\//i.test(lines[i])) continue;
      const title = lines[i];
      const url =
        lines[i + 1] && /^https?:\/\//i.test(lines[i + 1]) ? lines[++i] : "";
      entries.push(url ? `${title}\n${url}` : title);
    }
  }
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
  return `<div class="mck-source-columns">${columns
    .map(
      (items, column) =>
        `<div class="mck-source-column">${renderStructured(
          items.join("\n"),
          `s${slideIndex}-src${column}`
        )}</div>`
    )
    .join("")}</div>`;
}

function renderConceptVisual(slideNumber) {
  const step = (label, tone = "") =>
    `<div class="mck-concept-step ${tone}"><span>${esc(label)}</span></div>`;
  if (slideNumber === 6) {
    return `<div class="mck-concept mck-concept-compare">
      <div class="mck-concept-lane">${step("Chatbot", "is-blue")}<b>→</b>${step(
        "Responds"
      )}</div>
      <div class="mck-concept-lane">${step("Agent", "is-green")}<b>→</b>${step(
        "Steps"
      )}<b>→</b>${step("Tools + skills")}<b>→</b>${step("Workflow")}</div>
    </div>`;
  }
  if (slideNumber === 9) {
    return `<div class="mck-concept mck-concept-orbit">
      <div class="mck-orbit-center">Human Lead</div>
      ${["Agents", "Skills", "Tools + data", "QA/QC", "Escalation"]
        .map((label) => `<div class="mck-orbit-node">${esc(label)}</div>`)
        .join("")}
    </div>`;
  }
  if (slideNumber === 10) {
    return `<div class="mck-concept mck-concept-balance">
      ${step("Good uses", "is-blue")}<div class="mck-balance-mark">+</div>
      ${step("Professional judgment", "is-green")}
    </div>`;
  }
  if (slideNumber === 11) {
    return `<div class="mck-concept mck-concept-flow">
      ${step("Prompt", "is-blue")}<b>→</b>${step("Most likely response")}<b>→</b>
      ${step("Verify the source", "is-green")}<b>→</b>${step("Human professional")}
    </div>`;
  }
  if (slideNumber === 12) {
    return `<div class="mck-concept mck-concept-flow">
      ${step("Documents", "is-blue")}<b>→</b>${step("Retrieve")}<b>→</b>
      ${step("Generate", "is-green")}<b>→</b>${step("Answer")}
    </div>`;
  }
  if (slideNumber === 13) {
    return `<div class="mck-concept mck-concept-library">
      <strong>23</strong><span>State DOT resilience-related PDF documents</span>
      <div class="mck-doc-stack"><i></i><i></i><i></i></div>
    </div>`;
  }
  if (slideNumber === 15) {
    return `<div class="mck-concept mck-concept-shield">
      <div class="mck-shield-mark">✓</div><span>Human review</span>
      <span>Approved tools</span><span>Verify outputs</span><span>Document workflows</span>
    </div>`;
  }
  if (slideNumber === 23) {
    return `<div class="mck-concept mck-concept-flow">
      ${step("Tasks AI can help automate", "is-blue")}<b>→</b>
      ${step("Human-in-the-loop", "is-green")}<b>→</b>
      ${step("What still needs humans")}
    </div>`;
  }
  if (slideNumber === 24) {
    return `<div class="mck-concept mck-concept-rise">
      ${step("Faster work", "is-blue")}<b>↗</b>${step(
        "Higher-value advisory tasks",
        "is-green"
      )}<b>↗</b>${step("Future trends")}
    </div>`;
  }
  return "";
}

function footerHtml(body, slideIndex, slideNumber) {
  const footer = body.find(isFooter);
  const sourceFooter = footer
    ? `<p class="mck-draft-footer" ${slotAttrs(
        `s${slideIndex}-footer`,
        footer
      )}>${esc(footer)}</p>`
    : "";
  return `${sourceFooter}<div class="mck-page"><span>ATKINSRÉALIS · AI IN TRANSPORTATION</span><span>${String(
    slideNumber
  ).padStart(2, "0")}</span></div>`;
}

function slideHeader(title, slideIndex, slideNumber) {
  return `<header class="mck-header"><img class="mck-brand-logo" src="assets/atkinsrealis-logo-dark.png" alt="AtkinsRéalis"><div class="mck-kicker">AI IN TRANSPORTATION PLANNING &amp; ENGINEERING</div>${titleHtml(
    title,
    slideIndex
  )}<div class="mck-header-number">${String(slideNumber).padStart(
    2,
    "0"
  )}</div></header>`;
}

function renderSlide(slide, slideIndex) {
  const { title, body } = bodyBlocks(slide);
  const density = densityClass(body);
  const image = IMAGE_BY_SLIDE[slide.number];
  let layout = "mck-standard";
  let content = "";

  if (slide.number === 1) {
    const subtitle = body.filter((text) => !isFooter(text))[0] || "";
    layout = "mck-cover";
    content = `<figure class="mck-cover-visual" ${slotAttrs(
      `s${slideIndex}-image`,
      "AtkinsRéalis transportation AI keynote hero",
      "image"
    )}><img src="${image}" alt="Transportation planners and engineers using AI-assisted regional resilience dashboards"></figure><div class="mck-cover-shade"></div><div class="mck-cover-copy"><img class="mck-cover-logo" src="assets/atkinsrealis-logo-light.png" alt="AtkinsRéalis">${titleHtml(
      title,
      slideIndex
    )}<p class="mck-cover-subtitle" ${slotAttrs(
      `s${slideIndex}-subtitle`,
      subtitle
    )}>${esc(subtitle)}</p><p class="mck-cover-meta">TRANSPORTATION PLANNING · ENGINEERING · GIS · PROJECT DELIVERY</p></div>`;
  } else if (slide.number === 2) {
    layout = "mck-agenda-slide";
    const agendaBlocks = body.filter((text) => !isFooter(text));
    content = `${slideHeader(
      title,
      slideIndex,
      slide.number
    )}<div class="mck-main has-image"><div class="mck-agenda-stack">${renderAgenda(
      agendaBlocks[0] || "",
      slideIndex
    )}${
      agendaBlocks.slice(1).length
        ? `<div class="mck-agenda-note">${renderStructured(
            agendaBlocks.slice(1).join("\n"),
            `s${slideIndex}-agenda-note`
          )}</div>`
        : ""
    }</div>${imagePanel(slide.number, slideIndex, "right")}</div>`;
  } else if ([4, 5].includes(slide.number)) {
    layout = "mck-timeline-slide";
    content = `${slideHeader(
      title,
      slideIndex,
      slide.number
    )}<div class="mck-main">${renderTimeline(
      body,
      slideIndex,
      slide.number
    )}</div>`;
  } else if (slide.number === 7) {
    layout = "mck-stage-slide";
    content = `${slideHeader(
      title,
      slideIndex,
      slide.number
    )}<div class="mck-main">${renderPlanningStages(body, slideIndex)}</div>`;
  } else if ([8, 9].includes(slide.number)) {
    layout = "mck-role-slide";
    const roleImage = image && slide.number !== 9;
    content = `${slideHeader(
      title,
      slideIndex,
      slide.number
    )}<div class="mck-main ${
      roleImage ? "has-image" : ""
    }">${renderRoleGrid(body, slideIndex)}${renderConceptVisual(slide.number)}${
      roleImage ? imagePanel(slide.number, slideIndex, "right") : ""
    }</div>`;
  } else if (slide.number === 21) {
    layout = "mck-sources-slide";
    content = `${slideHeader(
      title,
      slideIndex,
      slide.number
    )}<div class="mck-main">${renderSources(body, slideIndex)}</div>`;
  } else if ([3, 22].includes(slide.number)) {
    layout = "mck-image-split";
    content = `${slideHeader(
      title,
      slideIndex,
      slide.number
    )}<div class="mck-main has-image"><div class="mck-text-side">${renderCards(
      body,
      slideIndex,
      slide.number === 24 ? 2 : 1,
      slide.number
    )}</div>${imagePanel(slide.number, slideIndex, "right")}</div>`;
  } else if (slide.number === 25) {
    layout = "mck-closing";
    content = `${slideHeader(
      title,
      slideIndex,
      slide.number
    )}<div class="mck-main has-image"><div class="mck-text-side">${renderCards(
      body,
      slideIndex,
      1,
      slide.number
    )}</div>${imagePanel(slide.number, slideIndex, "right")}</div>`;
  } else {
    const cardCount = cardTexts(body, slide.number).length;
    const columns = cardCount === 4 ? 2 : cardCount >= 3 ? 3 : 2;
    content = `${slideHeader(
      title,
      slideIndex,
      slide.number
    )}<div class="mck-main">${renderCards(
      body,
      slideIndex,
      columns,
      slide.number
    )}${renderConceptVisual(slide.number)}</div>`;
  }

  return `<section class="slide ${layout} ${density}${
    slideIndex === 0 ? " active" : ""
  }" id="slide-${slideIndex}" data-template-slide-index="${slide.number}" data-source-slide="${slide.number}">
    ${content}
    ${slide.number === 1 ? "" : footerHtml(body, slideIndex, slide.number)}
    <div class="slide-edit-layer" aria-hidden="true"></div>
  </section>`;
}

const customCss = `
<style id="atkinsrealis-transportation-theme">
  /* === ATKINSRÉALIS PREMIUM KEYNOTE THEME === */
  :root {
    --bg: #ffffff;
    --primary: #182d38;
    --primary-2: #3f32f1;
    --ink: #182d38;
    --muted: #182d38;
    --line: #bedae5;
    --soft: rgba(190, 218, 229, 0.24);
    --navy: #182d38;
    --teal: #05e560;
    --yellow: #b9ff00;
    --purple: #be02f8;
    --light-grey: #bedae5;
    --slide-padding: clamp(1.3rem, 3.5vw, 3.2rem);
    --deck-chrome-accent: #3f32f1;
  }
  body.ported-template-deck { background: var(--bg); color: var(--ink); }
  #deck.slides-offset > section.slide {
    background: var(--bg) !important;
    color: var(--ink);
    padding: clamp(0.85rem, 2.1vh, 1.3rem) clamp(1.4rem, 2.7vw, 2.6rem) clamp(1.35rem, 3.8vh, 2.3rem) !important;
    font-family: "Bienvenue", Arial, sans-serif;
    isolation: isolate;
  }
  #deck.slides-offset > section.slide::before {
    content: "";
    position: absolute;
    z-index: -1;
    width: min(48vw, 680px);
    height: min(48vw, 680px);
    right: calc(-1 * min(29vw, 420px));
    top: calc(-1 * min(26vw, 360px));
    border-radius: 50%;
    border: clamp(1.2rem, 3.2vw, 3.2rem) solid rgba(63, 50, 241, 0.08);
    box-shadow:
      0 0 0 clamp(1.2rem, 3.2vw, 3.2rem) rgba(5, 229, 96, 0.05),
      0 0 0 clamp(2.8rem, 6vw, 6rem) rgba(190, 218, 229, 0.16);
    pointer-events: none;
  }
  #deck.slides-offset > section.slide::after {
    content: "";
    position: absolute;
    z-index: 5;
    left: 0;
    top: clamp(1rem, 2.6vh, 1.8rem);
    width: clamp(0.28rem, 0.5vw, 0.45rem);
    height: clamp(2.4rem, 10vh, 5rem);
    background: var(--primary-2);
    pointer-events: none;
  }
  .mck-header {
    position: relative;
    flex: 0 0 auto;
    padding-right: 8%;
    margin-bottom: clamp(0.55rem, 1.5vh, 1rem);
    padding-bottom: clamp(0.25rem, 0.7vh, 0.45rem);
  }
  .mck-brand-logo {
    width: clamp(7rem, 10vw, 10rem);
    height: auto;
    display: block;
    margin-bottom: clamp(0.22rem, 0.55vh, 0.38rem);
  }
  .mck-kicker {
    color: var(--primary);
    font-size: clamp(0.56rem, 0.72vw, 0.72rem);
    font-weight: 750;
    letter-spacing: 0.11em;
    margin-bottom: clamp(0.25rem, 0.65vh, 0.4rem);
  }
  #deck .mck-title {
    color: var(--navy);
    font-family: "Gamechanger", "Arial Black", Arial, sans-serif;
    font-size: clamp(1.85rem, 2.35vw, 2.3rem) !important;
    line-height: 1.02 !important;
    letter-spacing: -0.025em;
    margin: 0;
    max-width: 95%;
  }
  #deck .slide[data-source-slide="13"] .mck-title {
    font-size: clamp(1.52rem, 1.95vw, 1.92rem) !important;
    line-height: 1.04 !important;
    max-width: 92%;
  }
  .mck-header-number {
    position: absolute;
    right: 0;
    top: 0;
    color: var(--primary-2);
    font-family: "Gamechanger", "Arial Black", Arial, sans-serif;
    font-size: clamp(0.72rem, 1vw, 0.95rem);
    font-weight: 700;
  }
  .mck-main {
    flex: 1 1 auto;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    scroll-behavior: smooth;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--light-grey) transparent;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  .mck-main.has-image {
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(280px, 0.72fr);
    gap: clamp(1rem, 2vw, 2rem);
    align-items: stretch;
  }
  .mck-card-grid {
    flex: 0 0 auto;
    display: grid;
    gap: clamp(0.55rem, 1.15vw, 1rem);
    min-height: 0;
    height: auto;
    grid-auto-rows: auto;
    align-items: stretch;
  }
  .mck-card-grid.cols-1 { grid-template-columns: 1fr; }
  .mck-card-grid.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .mck-card-grid.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  #deck .slide[data-source-slide="14"] .mck-main {
    overflow-y: hidden;
  }
  #deck .slide[data-source-slide="14"] .mck-card-grid {
    flex: 1 1 auto;
    height: 100%;
    grid-template-rows: minmax(0, 0.58fr) minmax(0, 0.42fr);
  }
  #deck .slide[data-source-slide="7"] .mck-main {
    overflow-y: hidden;
  }
  .mck-stage-grid {
    flex: 1 1 auto;
    min-height: 0;
    display: grid;
    grid-template-columns:
      minmax(0, 0.82fr) auto
      minmax(0, 1fr) auto
      minmax(0, 1.28fr);
    gap: clamp(0.35rem, 0.7vw, 0.65rem);
    align-items: stretch;
  }
  .mck-stage-card {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: rgba(190, 218, 229, 0.16);
    border: 1px solid var(--line);
  }
  .mck-stage-label {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: clamp(0.5rem, 0.85vw, 0.8rem);
    min-height: clamp(3rem, 7vh, 4.4rem);
    padding: clamp(0.55rem, 0.9vw, 0.85rem);
    background: var(--navy);
    color: #fff;
    font-family: "Gamechanger", "Arial Black", Arial, sans-serif;
    font-size: clamp(1.25rem, 1.55vw, 1.55rem);
    font-weight: 800;
  }
  .stage-2 .mck-stage-label { background: var(--primary-2); }
  .stage-3 .mck-stage-label {
    background: var(--teal);
    color: var(--navy);
  }
  .mck-stage-label span {
    opacity: 0.65;
    font-size: clamp(0.7rem, 0.85vw, 0.86rem);
    letter-spacing: 0.08em;
  }
  .mck-stage-body {
    flex: 1 1 auto;
    min-height: 0;
    padding: clamp(0.65rem, 1vw, 0.95rem);
    overflow: hidden;
  }
  .mck-stage-body .mck-copy,
  .mck-stage-body .mck-subhead {
    font-size: clamp(0.98rem, 1.12vw, 1.1rem) !important;
    line-height: 1.2 !important;
  }
  .mck-stage-arrow {
    align-self: center;
    color: var(--primary-2);
    font-size: clamp(1.5rem, 2.1vw, 2.1rem);
    font-weight: 800;
  }
  #deck .slide[data-source-slide="16"] .mck-card {
    display: flex;
    flex-direction: column;
  }
  .mck-card {
    min-height: min-content;
    overflow: visible;
    background: rgba(190, 218, 229, 0.16);
    border: 1px solid var(--line);
    border-top: 4px solid var(--primary-2);
    padding: clamp(0.65rem, 1.15vw, 1rem);
    box-shadow: none;
  }
  .mck-card:nth-child(3n+2) { border-top-color: var(--teal); }
  .mck-card:nth-child(3n+3) { border-top-color: var(--primary); }
  .mck-subhead {
    color: var(--primary);
    font-family: "Bienvenue", Arial, sans-serif;
    font-weight: 700;
    font-size: clamp(1.25rem, 1.5vw, 1.5rem) !important;
    line-height: 1.22 !important;
    margin: 0 0 clamp(0.2rem, 0.5vh, 0.4rem);
  }
  .mck-copy, .mck-list li, .mck-url {
    color: var(--ink);
    font-size: clamp(1.05rem, 1.25vw, 1.2rem);
    line-height: 1.24;
    margin: 0 0 clamp(0.18rem, 0.43vh, 0.34rem);
  }
  .mck-inline-label strong {
    color: var(--primary);
    font-weight: 750;
  }
  .mck-source-note {
    margin-top: auto;
    padding-top: clamp(0.55rem, 1.2vh, 0.85rem);
    border-top: 1px solid var(--line);
    color: var(--muted);
    font-weight: 400 !important;
  }
  .mck-list { margin: 0 0 0.25rem; padding: 0; list-style: none; }
  .mck-list li { position: relative; padding-left: 0.9rem; }
  .mck-list li::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0.48em;
    width: 0.35rem;
    height: 0.35rem;
    background: var(--primary-2);
    border-radius: 1px;
  }
  .mck-date {
    color: var(--primary-2);
    font-family: "Bienvenue", Arial, sans-serif;
    font-size: clamp(1.05rem, 1.25vw, 1.2rem);
    font-weight: 750;
    line-height: 1.2;
    margin: 0 0 0.3rem;
  }
  .mck-url {
    color: var(--primary-2);
    display: block;
    overflow-wrap: anywhere;
    text-decoration: none;
  }
  .density-dense .mck-copy, .density-dense .mck-list li, .density-dense .mck-url,
  .density-compact .mck-copy, .density-compact .mck-list li, .density-compact .mck-url,
  .density-micro .mck-copy, .density-micro .mck-list li, .density-micro .mck-url {
    font-size: clamp(1.05rem, 1.25vw, 1.2rem);
    line-height: 1.2;
    margin-bottom: clamp(0.1rem, 0.25vh, 0.18rem);
  }
  .density-compact .mck-subhead,
  .density-micro .mck-subhead {
    font-size: clamp(1.17rem, 1.4vw, 1.4rem) !important;
  }
  .mck-image-panel {
    min-height: 0;
    margin: 0;
    overflow: hidden;
    background: var(--light-grey);
    border: 1px solid var(--light-grey);
    position: relative;
  }
  .mck-image-panel::after {
    content: "AI-ASSISTED TRANSPORTATION WORKFLOW";
    position: absolute;
    left: 0.75rem;
    bottom: 0.65rem;
    background: rgba(24,45,56,.94);
    color: #fff;
    padding: 0.32rem 0.48rem;
    font-size: clamp(0.46rem, 0.62vw, 0.62rem);
    font-weight: 750;
    letter-spacing: 0.08em;
  }
  .mck-image-panel img {
    width: 100%;
    height: 100%;
    max-height: none;
    object-fit: cover;
    object-position: center;
    display: block;
  }
  .mck-text-side {
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    scroll-behavior: smooth;
    overscroll-behavior: contain;
  }
  .mck-page {
    position: absolute;
    left: clamp(2rem, 4.3vw, 4.2rem);
    right: clamp(2rem, 4.3vw, 4.2rem);
    bottom: clamp(0.5rem, 1.7vh, 0.9rem);
    display: flex;
    justify-content: space-between;
    color: var(--primary);
    font-size: clamp(0.46rem, 0.6vw, 0.62rem);
    letter-spacing: 0.08em;
    font-weight: 650;
  }
  .mck-draft-footer {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: clamp(0.52rem, 1.8vh, 0.94rem);
    color: rgba(24, 45, 56, 0.5);
    font-size: clamp(0.43rem, 0.55vw, 0.56rem);
    white-space: nowrap;
  }
  .mck-agenda {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: clamp(0.45rem, 0.9vw, 0.8rem);
    min-height: 0;
  }
  .mck-agenda-stack {
    min-height: 0;
    display: block;
  }
  .mck-agenda { grid-auto-rows: auto; margin-bottom: clamp(0.4rem, 0.8vw, 0.65rem); }
  .mck-agenda-note {
    background: var(--navy);
    border-left: 4px solid var(--teal);
    padding: 0.45rem 0.65rem;
  }
  .mck-agenda-note .mck-copy,
  .mck-agenda-note .mck-subhead {
    color: #fff;
    margin: 0;
    font-size: clamp(0.54rem, 0.7vw, 0.72rem) !important;
  }
  .mck-agenda-item {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.7rem;
    padding: clamp(0.55rem, 0.9vw, 0.85rem);
    background: rgba(190, 218, 229, 0.16);
    border-left: 4px solid var(--primary-2);
    border-top: 1px solid var(--line);
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    min-height: 0;
  }
  .mck-agenda-num {
    color: var(--primary-2);
    font-family: "Gamechanger", "Arial Black", Arial, sans-serif;
    font-size: clamp(1rem, 1.7vw, 1.55rem);
    font-weight: 750;
  }
  .mck-agenda-item h3 {
    color: var(--navy);
    font-size: clamp(1.25rem, 1.5vw, 1.5rem) !important;
    line-height: 1.2 !important;
    margin: 0 0 0.22rem;
  }
  .mck-agenda-item p {
    color: var(--muted);
    font-size: clamp(1.05rem, 1.25vw, 1.2rem);
    line-height: 1.25;
    margin: 0;
  }
  .mck-timeline-intro {
    flex: 0 0 auto;
    background: rgba(190, 218, 229, 0.2);
    border-left: 4px solid var(--primary-2);
    padding: 0.55rem 0.8rem;
    margin-bottom: 0.65rem;
  }
  .mck-timeline-intro .mck-copy { margin: 0; }
  .mck-timeline {
    flex: none;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-auto-rows: minmax(min-content, 1fr);
    gap: clamp(0.45rem, 0.85vw, 0.75rem);
  }
  .mck-timeline.mck-timeline-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .mck-timeline.mck-timeline-slide-5 {
    flex: 1 1 auto;
    height: 100%;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    grid-template-rows: minmax(0, 0.36fr) minmax(0, 0.64fr);
  }
  #deck .slide[data-source-slide="5"] .mck-main {
    overflow-y: hidden;
  }
  .mck-timeline-slide-5 .mck-timeline-card:nth-child(-n+3) { grid-column: span 4; }
  .mck-timeline-slide-5 .mck-timeline-card:nth-child(4) { grid-column: span 3; }
  .mck-timeline-slide-5 .mck-timeline-card:nth-child(5) { grid-column: span 4; }
  .mck-timeline-slide-5 .mck-timeline-card:nth-child(6) { grid-column: span 5; }
  .mck-timeline-card {
    min-height: 0;
    overflow: visible;
    background: rgba(190, 218, 229, 0.14);
    border: 1px solid var(--line);
    padding: clamp(0.5rem, 0.85vw, 0.75rem);
    position: relative;
  }
  .mck-timeline-card::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--primary-2);
  }
  .mck-role-slide .mck-main.has-image {
    grid-template-columns: minmax(0, 1.25fr) minmax(250px, 0.55fr);
  }
  .mck-lead {
    background: rgba(190, 218, 229, 0.2);
    border-left: 4px solid var(--teal);
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.55rem;
  }
  .mck-role-grid {
    flex: none;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-auto-rows: minmax(min-content, 1fr);
    gap: clamp(0.45rem, 0.85vw, 0.75rem);
  }
  .mck-role-grid.mck-role-grid-slide-8 {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .mck-role-grid-slide-8 .mck-role-card:nth-child(-n+3) { grid-column: span 4; }
  .mck-role-grid-slide-8 .mck-role-card:nth-child(4) { grid-column: span 5; }
  .mck-role-grid-slide-8 .mck-role-card:nth-child(5) { grid-column: span 3; }
  .mck-role-grid-slide-8 .mck-role-card:nth-child(6) { grid-column: span 4; }
  .mck-role-card {
    min-height: 0;
    overflow: visible;
    background: rgba(190, 218, 229, 0.14);
    border: 1px solid var(--line);
    padding: clamp(0.45rem, 0.8vw, 0.72rem);
    position: relative;
  }
  .mck-role-index {
    color: var(--primary-2);
    font-size: clamp(0.48rem, 0.6vw, 0.62rem);
    font-weight: 700;
  }
  .mck-role-card h3 {
    color: var(--primary);
    font-size: clamp(1.17rem, 1.4vw, 1.4rem) !important;
    margin: 0.1rem 0 0.25rem;
    line-height: 1.16 !important;
  }
  .mck-concept {
    flex: 0 0 auto;
    margin-top: clamp(0.55rem, 1.05vw, 0.9rem);
    padding: clamp(0.58rem, 0.95vw, 0.85rem);
    background:
      linear-gradient(135deg, rgba(63, 50, 241, 0.06), rgba(5, 229, 96, 0.05));
    border: 1px solid var(--line);
    min-height: clamp(4.6rem, 10vh, 7rem);
  }
  .mck-concept-step {
    min-width: 0;
    min-height: clamp(2.3rem, 5.2vh, 3.5rem);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.42rem 0.65rem;
    background: #fff;
    border: 1px solid var(--line);
    border-left: 5px solid var(--primary);
    color: var(--navy);
    font-size: clamp(1.05rem, 1.18vw, 1.16rem);
    font-weight: 750;
    line-height: 1.15;
    text-align: center;
  }
  .mck-concept-step.is-blue { border-left-color: var(--primary-2); }
  .mck-concept-step.is-green { border-left-color: var(--teal); }
  .mck-concept b {
    color: var(--primary-2);
    font-size: clamp(1.3rem, 1.7vw, 1.75rem);
    line-height: 1;
  }
  .mck-concept-lane,
  .mck-concept-flow,
  .mck-concept-balance,
  .mck-concept-rise {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(0.35rem, 0.75vw, 0.7rem);
  }
  .mck-concept-lane + .mck-concept-lane { margin-top: 0.55rem; }
  .mck-concept-lane .mck-concept-step,
  .mck-concept-flow .mck-concept-step,
  .mck-concept-rise .mck-concept-step { flex: 1 1 0; }
  .mck-concept-balance .mck-concept-step { flex: 0 1 38%; }
  .mck-balance-mark {
    width: clamp(2.5rem, 4vw, 4rem);
    height: clamp(2.5rem, 4vw, 4rem);
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--navy);
    color: var(--teal);
    font: 800 clamp(1.4rem, 2vw, 2rem)/1 "Gamechanger", Arial, sans-serif;
  }
  .mck-concept-orbit {
    position: relative;
    min-height: clamp(9.2rem, 22vh, 14rem);
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    align-items: end;
    gap: 0.55rem;
    padding-top: clamp(4rem, 9vh, 6rem);
  }
  .mck-orbit-center {
    position: absolute;
    left: 50%;
    top: 0.7rem;
    transform: translateX(-50%);
    min-width: min(32%, 15rem);
    padding: 0.75rem 1rem;
    background: var(--navy);
    border-bottom: 5px solid var(--teal);
    color: #fff;
    font-size: clamp(1.08rem, 1.3vw, 1.3rem);
    font-weight: 800;
    text-align: center;
  }
  .mck-orbit-center::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 100%;
    height: clamp(2.3rem, 5vh, 3.6rem);
    border-left: 2px solid var(--primary-2);
  }
  .mck-orbit-node {
    position: relative;
    min-height: clamp(2.7rem, 6vh, 4rem);
    display: grid;
    place-items: center;
    padding: 0.45rem;
    background: #fff;
    border: 1px solid var(--line);
    border-top: 4px solid var(--primary-2);
    color: var(--navy);
    font-size: clamp(1rem, 1.15vw, 1.14rem);
    font-weight: 750;
    text-align: center;
  }
  .mck-orbit-node::before {
    content: "";
    position: absolute;
    left: 50%;
    bottom: 100%;
    height: clamp(1.1rem, 2.6vh, 2rem);
    border-left: 1px solid var(--line);
  }
  .mck-concept-library {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: clamp(0.7rem, 1.4vw, 1.4rem);
  }
  .mck-concept-library strong {
    color: var(--primary-2);
    font: 800 clamp(2.8rem, 5vw, 5rem)/0.85 "Gamechanger", Arial, sans-serif;
  }
  .mck-concept-library > span {
    color: var(--navy);
    font-size: clamp(1.15rem, 1.55vw, 1.55rem);
    font-weight: 750;
    line-height: 1.15;
  }
  .mck-doc-stack {
    width: clamp(4rem, 7vw, 6.7rem);
    height: clamp(3.2rem, 6vw, 5.8rem);
    position: relative;
  }
  .mck-doc-stack i {
    position: absolute;
    inset: 0;
    background: #fff;
    border: 2px solid var(--primary-2);
  }
  .mck-doc-stack i:nth-child(1) { transform: translate(-0.5rem, 0.5rem); opacity: 0.38; }
  .mck-doc-stack i:nth-child(2) { transform: translate(-0.25rem, 0.25rem); opacity: 0.65; }
  .mck-doc-stack i:nth-child(3)::after {
    content: "";
    position: absolute;
    left: 16%;
    right: 16%;
    top: 27%;
    height: 2px;
    background: var(--line);
    box-shadow: 0 0.65rem 0 var(--line), 0 1.3rem 0 var(--line);
  }
  .mck-concept-shield {
    display: grid;
    grid-template-columns: auto repeat(4, minmax(0, 1fr));
    align-items: center;
    gap: 0.55rem;
  }
  .mck-concept-shield > span {
    padding: 0.55rem;
    background: #fff;
    border: 1px solid var(--line);
    color: var(--navy);
    font-size: clamp(1rem, 1.12vw, 1.12rem);
    font-weight: 750;
    text-align: center;
  }
  .mck-shield-mark {
    width: clamp(3.2rem, 5vw, 5rem);
    height: clamp(3.7rem, 5.8vw, 5.8rem);
    display: grid;
    place-items: center;
    clip-path: polygon(50% 0, 92% 18%, 84% 72%, 50% 100%, 16% 72%, 8% 18%);
    background: var(--navy);
    color: var(--teal);
    font-size: clamp(1.5rem, 2.4vw, 2.4rem);
    font-weight: 900;
  }
  .mck-source-columns {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: clamp(0.35rem, 0.6vw, 0.6rem);
  }
  .mck-source-column {
    background: rgba(190, 218, 229, 0.12);
    border: 1px solid var(--line);
    padding: 0.55rem 0.75rem;
    min-height: 0;
    overflow-y: auto;
    columns: 1;
  }
  .mck-source-column .mck-copy {
    font-weight: 650;
    color: var(--navy);
    margin-top: 0.18rem;
  }
  .mck-source-column .mck-url {
    color: var(--primary-2);
    margin-bottom: 0.2rem;
  }
  #deck .mck-cover {
    background: var(--navy) !important;
    color: #fff;
    padding: 0 !important;
    display: block !important;
    overflow: hidden;
  }
  #deck .mck-cover::before,
  #deck .mck-cover::after { display: none; }
  .mck-cover-visual {
    position: absolute;
    inset: 0;
    margin: 0;
  }
  .mck-cover-visual img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
  }
  .mck-cover-shade {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(24,45,56,.98) 0%, rgba(24,45,56,.92) 38%, rgba(24,45,56,.3) 62%, rgba(24,45,56,.04) 100%);
  }
  .mck-cover-copy {
    position: absolute;
    inset: 0 auto 0 0;
    width: 64%;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: clamp(2rem, 4vw, 4rem) clamp(1.5rem, 2.5vw, 2.5rem);
    padding-left: clamp(2.5rem, 5vw, 5rem);
  }
  .mck-cover-logo {
    width: clamp(10rem, 16vw, 16rem);
    height: auto;
    margin-bottom: clamp(1.2rem, 3vh, 2.2rem);
  }
  #deck .mck-cover .mck-title {
    color: #fff;
    font-size: clamp(2rem, 3.1vw, 2.6rem) !important;
    max-width: 95%;
    margin: 0 0 clamp(1rem, 2.5vh, 1.8rem);
  }
  .mck-cover-subtitle {
    color: var(--light-grey);
    font-size: clamp(1.33rem, 1.65vw, 1.5rem);
    line-height: 1.45;
    max-width: 84%;
    margin: 0;
  }
  .mck-cover-meta {
    color: var(--teal);
    font-size: clamp(0.58rem, 0.75vw, 0.76rem);
    font-weight: 700;
    letter-spacing: 0.07em;
    margin-top: clamp(1.4rem, 3vh, 2.2rem);
    text-transform: uppercase;
  }
  .mck-closing .mck-card { border-top-color: var(--teal); }
  .nav-dots { display: none !important; }
  .keyboard-hint { display: none !important; }
  @media (max-height: 700px) {
    #deck.slides-offset > section.slide {
      padding-top: clamp(0.8rem, 2vh, 1.25rem) !important;
      padding-bottom: clamp(1.4rem, 4.7vh, 2.6rem) !important;
    }
    .mck-header { margin-bottom: 0.45rem; padding-bottom: 0.4rem; }
    .mck-card { padding: 0.5rem 0.62rem; }
    .mck-main.has-image { gap: 0.8rem; }
  }
</style>`;

const renderedSlides = sourceSlides
  .map((slide, index) => renderSlide(slide, index))
  .join("\n");

const start = template.indexOf('<section class="slide');
const end = template.indexOf("\n</div>\n<script id=\"swiss-slot-edit-runtime-js\">");
if (start < 0 || end < 0) {
  throw new Error("Could not locate the slide section range in the template.");
}
template = template.slice(0, start) + renderedSlides + template.slice(end);

template = template
  .replace(
    `    _wheel(e) {
      if (document.body.classList.contains('deck-edit-mode')) return;
      if (Math.abs(e.deltaY) < 8) return;
      e.preventDefault();
      if (e.deltaY > 0) this.goTo(this.current + 1);
      else this.goTo(this.current - 1);
    }`,
    `    _wheel(e) {
      if (document.body.classList.contains('deck-edit-mode')) return;
      if (Math.abs(e.deltaY) < 8) return;
      const scroller = e.target && e.target.closest
        ? e.target.closest('.mck-main, .mck-text-side, .mck-source-column')
        : null;
      if (scroller && scroller.scrollHeight > scroller.clientHeight + 2) {
        const atTop = scroller.scrollTop <= 1;
        const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
        if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) return;
      }
      e.preventDefault();
      if (e.deltaY > 0) this.goTo(this.current + 1);
      else this.goTo(this.current - 1);
    }`
  )
  .replace(
    /<html[^>]+>/,
    '<html lang="en" data-deck-id="ai-transportation-atkinsrealis-2026" data-template-source="atkinsrealis-premium-keynote" data-template-edit-mode="slots" data-mobile-adaptation="desktop-default">'
  )
  .replace(
    /<title>[\s\S]*?<\/title>/,
    "<title>AI in Transportation Planning and Engineering — AtkinsRéalis Editable</title>"
  )
  .replace("</head>", `${customCss}\n</head>`)
  .replace(
    "</body>",
    `<script type="application/json" id="deck-source-data">${JSON.stringify({
      version: 1,
      source: "AI in Transportation Planning and Engineering.pptx",
      template: "AtkinsRéalis premium conference keynote",
      brandSource: "https://brand.atkinsrealis.com/point/en/atkinsrealis/",
      imageBySlide: IMAGE_BY_SLIDE,
      slides: sourceSlides,
    }).replace(/</g, "\\u003c")}</script>\n</body>`
  );

fs.writeFileSync(outputPath, template, "utf8");
console.log(`Wrote ${sourceSlides.length} slides to ${outputPath}`);
