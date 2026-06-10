const memoryGrid = document.querySelector("#memory-grid");
const timelineList = document.querySelector("#timeline-list");
const categoryFilter = document.querySelector("#category-filter");
const memoryCount = document.querySelector("#memory-count");

let memories = [];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return escapeHtml(dateText);
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function createImage(memory) {
  if (!memory.image) {
    return `<div class="memory-image" aria-label="사진 준비 중">사진 준비 중</div>`;
  }

  return `
    <div class="memory-image">
      <img src="${escapeHtml(memory.image)}" alt="${escapeHtml(memory.title)} 사진" loading="lazy" />
    </div>
  `;
}

function renderCards(items) {
  if (!items.length) {
    memoryGrid.innerHTML = `<p>선택한 분류에 해당하는 추억이 없습니다.</p>`;
    return;
  }

  memoryGrid.innerHTML = items
    .map(
      (memory) => `
        <article class="memory-card">
          ${createImage(memory)}
          <div class="memory-body">
            <div class="memory-meta">
              <span>${formatDate(memory.date)}</span>
              <span>${escapeHtml(memory.place)}</span>
              <span class="tag">${escapeHtml(memory.category)}</span>
            </div>
            <h3>${escapeHtml(memory.title)}</h3>
            <p>${escapeHtml(memory.description)}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderTimeline(items) {
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));

  timelineList.innerHTML = sorted
    .map(
      (memory) => `
        <article class="timeline-item">
          <time class="timeline-date" datetime="${escapeHtml(memory.date)}">${formatDate(memory.date)}</time>
          <div>
            <p class="timeline-title">${escapeHtml(memory.title)}</p>
            <p class="timeline-place">${escapeHtml(memory.place)} · ${escapeHtml(memory.category)}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderFilter(items) {
  const categories = [...new Set(items.map((memory) => memory.category))].sort();
  categoryFilter.innerHTML = [
    `<option value="all">전체</option>`,
    ...categories.map(
      (category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`,
    ),
  ].join("");
}

function applyFilter() {
  const selected = categoryFilter.value;
  const filtered =
    selected === "all"
      ? memories
      : memories.filter((memory) => memory.category === selected);

  renderCards(filtered);
  renderTimeline(filtered);
}

async function loadMemories() {
  try {
    const response = await fetch("data/memories.json");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    memories = await response.json();
    memoryCount.textContent = String(memories.length);
    renderFilter(memories);
    applyFilter();
  } catch (error) {
    memoryGrid.innerHTML =
      "<p>추억 데이터를 불러오지 못했습니다. data/memories.json 파일을 확인해 주세요.</p>";
    timelineList.innerHTML = "";
    memoryCount.textContent = "0";
    console.error(error);
  }
}

categoryFilter.addEventListener("change", applyFilter);
loadMemories();
