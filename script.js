const memoryGrid = document.querySelector("#memory-grid");
const timelineList = document.querySelector("#timeline-list");
const categoryFilter = document.querySelector("#category-filter");
const memoryCount = document.querySelector("#memory-count");
const memberTabs = document.querySelectorAll(".member-tab");
const memberNameInput = document.querySelector("#member-name");
const photoUpload = document.querySelector("#photo-upload");
const photoPreview = document.querySelector("#photo-preview");
const memberStatus = document.querySelector("#member-status");

let memories = [];
let activeMemberId = "member-1";
let familyState = {
  "member-1": { name: "구성원 1", photos: [] },
  "member-2": { name: "구성원 2", photos: [] },
  "member-3": { name: "구성원 3", photos: [] },
  "member-4": { name: "구성원 4", photos: [] },
};

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

function loadFamilyState() {
  try {
    const saved = localStorage.getItem("family-memory-members");
    if (!saved) {
      return;
    }

    familyState = { ...familyState, ...JSON.parse(saved) };
  } catch (error) {
    console.error(error);
  }
}

function saveFamilyState() {
  try {
    localStorage.setItem("family-memory-members", JSON.stringify(familyState));
  } catch (error) {
    memberStatus.textContent =
      "브라우저 저장 공간이 부족합니다. 사진 수나 파일 크기를 줄여 주세요.";
    console.error(error);
  }
}

function syncMemberTabs() {
  memberTabs.forEach((tab) => {
    const member = familyState[tab.dataset.member];
    const isActive = tab.dataset.member === activeMemberId;

    tab.textContent = member.name || tab.dataset.member;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
}

function renderMemberPanel() {
  const member = familyState[activeMemberId];
  memberNameInput.value = member.name;
  memberStatus.textContent = `사진 ${member.photos.length}장`;

  if (!member.photos.length) {
    photoPreview.innerHTML = `<div class="empty-photos">아직 선택한 사진이 없습니다.</div>`;
    return;
  }

  photoPreview.innerHTML = member.photos
    .map(
      (photo, index) => `
        <div class="photo-tile">
          <img src="${escapeHtml(photo)}" alt="${escapeHtml(member.name)} 사진 ${index + 1}" />
        </div>
      `,
    )
    .join("");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

async function handlePhotoUpload(event) {
  const files = [...event.target.files].filter((file) => file.type.startsWith("image/"));
  if (!files.length) {
    return;
  }

  const encodedPhotos = await Promise.all(files.map(readFileAsDataUrl));
  familyState[activeMemberId].photos.push(...encodedPhotos);
  saveFamilyState();
  renderMemberPanel();
  photoUpload.value = "";
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
memberTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeMemberId = tab.dataset.member;
    syncMemberTabs();
    renderMemberPanel();
  });
});
memberNameInput.addEventListener("input", () => {
  familyState[activeMemberId].name = memberNameInput.value.trim() || activeMemberId;
  saveFamilyState();
  syncMemberTabs();
});
photoUpload.addEventListener("change", handlePhotoUpload);
loadFamilyState();
syncMemberTabs();
renderMemberPanel();
loadMemories();
