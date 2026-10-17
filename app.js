const languageGroups = [
  {
    label: "Европа",
    options: [
      ["ru", "Русский"], ["en", "English"], ["uk", "Українська"], ["de", "Deutsch"], ["fr", "Français"], ["es", "Español"], ["it", "Italiano"], ["pt", "Português"], ["nl", "Nederlands"], ["pl", "Polski"], ["cs", "Čeština"], ["sk", "Slovenčina"], ["sl", "Slovenščina"], ["hr", "Hrvatski"], ["sr", "Српски"], ["bg", "Български"], ["ro", "Română"], ["hu", "Magyar"], ["el", "Ελληνικά"], ["sv", "Svenska"], ["no", "Norsk"], ["da", "Dansk"], ["fi", "Suomi"], ["et", "Eesti"], ["lv", "Latviešu"], ["lt", "Lietuvių"], ["is", "Íslenska"], ["ga", "Gaeilge"], ["tr", "Türkçe"]
    ]
  },
  {
    label: "Азия",
    options: [
      ["zh-CN", "中文 — 简体"], ["zh-TW", "中文 — 繁體"], ["ja", "日本語"], ["ko", "한국어"], ["hi", "हिन्दी"], ["bn", "বাংলা"], ["th", "ไทย"], ["vi", "Tiếng Việt"], ["id", "Bahasa Indonesia"], ["ms", "Bahasa Melayu"], ["fil", "Filipino"], ["ta", "தமிழ்"], ["te", "తెలుగు"], ["ml", "മലയാളം"], ["ur", "اردو"], ["fa", "فارسی"], ["he", "עברית"], ["ar", "العربية"], ["ka", "ქართული"], ["hy", "Հայերեն"], ["az", "Azərbaycanca"], ["kk", "Қазақша"], ["uz", "O‘zbekcha"], ["mn", "Монгол"], ["my", "မြန်မာ"]
    ]
  }
];

const sourceLang = document.querySelector("#sourceLang");
const targetLang = document.querySelector("#targetLang");
const sourceText = document.querySelector("#sourceText");
const translationOutput = document.querySelector("#translationOutput");
const translateButton = document.querySelector("#translateButton");
const statusMessage = document.querySelector("#statusMessage");
const charCount = document.querySelector("#charCount");
const resultLanguage = document.querySelector("#resultLanguage");
const historySection = document.querySelector("#historySection");
const historyList = document.querySelector("#historyList");
const themeToggle = document.querySelector("#themeToggle");
const MAX_HISTORY = 5;
let isLoading = false;

function allLanguages() {
  return languageGroups.flatMap((group) => group.options);
}

function languageName(code) {
  if (code === "auto") return "Определение языка";
  return allLanguages().find(([value]) => value === code)?.[1] || code;
}

function fillLanguageSelect(select, includeAuto = false) {
  if (includeAuto) {
    const auto = document.createElement("option");
    auto.value = "auto";
    auto.textContent = "Определить язык";
    select.appendChild(auto);
  }
  languageGroups.forEach(({ label, options }) => {
    const group = document.createElement("optgroup");
    group.label = label;
    options.forEach(([code, labelText]) => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = labelText;
      group.appendChild(option);
    });
    select.appendChild(group);
  });
}

fillLanguageSelect(sourceLang, true);
fillLanguageSelect(targetLang);
sourceLang.value = "ru";
targetLang.value = "en";

function setStatus(message = "", kind = "") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message${kind ? ` is-${kind}` : ""}`;
}

function updateCount() {
  charCount.textContent = `${sourceText.value.length} / 5000`;
}

function setLoading(value) {
  isLoading = value;
  translateButton.classList.toggle("is-loading", value);
  translateButton.querySelector(".button-label").textContent = value ? "Перевожу…" : "Перевести";
  translateButton.querySelector(".button-arrow").style.display = value ? "none" : "block";
}

function saveHistory(source, result) {
  const entries = JSON.parse(localStorage.getItem("komok-history") || "[]");
  entries.unshift({ source, result, from: sourceLang.value, to: targetLang.value, time: Date.now() });
  localStorage.setItem("komok-history", JSON.stringify(entries.slice(0, MAX_HISTORY)));
  renderHistory();
}

function renderHistory() {
  const entries = JSON.parse(localStorage.getItem("komok-history") || "[]");
  historyList.innerHTML = "";
  historySection.classList.toggle("hidden", entries.length === 0);
  entries.forEach((entry) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "history-item";
    row.title = "Открыть этот перевод";
    const from = document.createElement("span");
    from.textContent = entry.source;
    const to = document.createElement("span");
    to.textContent = entry.result;
    row.append(from, to);
    row.addEventListener("click", () => {
      sourceText.value = entry.source;
      translationOutput.textContent = entry.result;
      translationOutput.classList.remove("is-empty");
      sourceLang.value = entry.from;
      targetLang.value = entry.to;
      resultLanguage.textContent = languageName(entry.to);
      updateCount();
      setStatus("Перевод восстановлен из истории.", "success");
    });
    historyList.appendChild(row);
  });
}

async function requestTranslation(text, from, to) {
  const endpoint = new URL("https://api.mymemory.translated.net/get");
  endpoint.searchParams.set("q", text);
  endpoint.searchParams.set("langpair", `${from === "auto" ? "autodetect" : from}|${to}`);
  const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const translated = data?.responseData?.translatedText;
  if (!translated || data.responseStatus === 403) throw new Error("Translation unavailable");
  return translated;
}

async function translate() {
  const text = sourceText.value.trim();
  const from = sourceLang.value;
  const to = targetLang.value;
  if (isLoading) return;
  if (!text) {
    setStatus("Сначала введите текст для перевода.", "error");
    sourceText.focus();
    return;
  }
  if (from !== "auto" && from === to) {
    setStatus("Выберите разные языки для перевода.", "error");
    return;
  }
  setLoading(true);
  setStatus("Соединяюсь с сервисом перевода…");
  try {
    const result = await requestTranslation(text, from, to);
    translationOutput.textContent = result;
    translationOutput.classList.remove("is-empty");
    resultLanguage.textContent = languageName(to);
    setStatus("Перевод готов.", "success");
    saveHistory(text, result);
  } catch (error) {
    console.error(error);
    setStatus("Не удалось выполнить перевод. Проверьте соединение и попробуйте ещё раз.", "error");
  } finally {
    setLoading(false);
  }
}

function swapLanguages() {
  if (sourceLang.value === "auto") {
    setStatus("Для автоопределения выберите исходный язык перед обменом.", "error");
    return;
  }
  const previousSource = sourceLang.value;
  sourceLang.value = targetLang.value;
  targetLang.value = previousSource;
  if (!translationOutput.classList.contains("is-empty")) {
    const oldSource = sourceText.value;
    sourceText.value = translationOutput.textContent;
    translationOutput.textContent = oldSource || "Перевод появится здесь";
    translationOutput.classList.toggle("is-empty", !oldSource);
  }
  resultLanguage.textContent = languageName(targetLang.value);
  updateCount();
  setStatus("");
}

async function copyResult() {
  const text = translationOutput.classList.contains("is-empty") ? "" : translationOutput.textContent;
  if (!text) {
    setStatus("Пока нечего копировать.", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Перевод скопирован.", "success");
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(translationOutput);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("copy");
    selection.removeAllRanges();
    setStatus("Перевод скопирован.", "success");
  }
}

sourceText.addEventListener("input", () => { updateCount(); setStatus(""); });
sourceText.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") translate();
});
targetLang.addEventListener("change", () => { resultLanguage.textContent = languageName(targetLang.value); });
document.querySelector("#translateButton").addEventListener("click", translate);
document.querySelector("#swapButton").addEventListener("click", swapLanguages);
document.querySelector("#copyButton").addEventListener("click", copyResult);
document.querySelector("#clearButton").addEventListener("click", () => {
  sourceText.value = "";
  translationOutput.textContent = "Перевод появится здесь";
  translationOutput.classList.add("is-empty");
  updateCount();
  setStatus("");
  sourceText.focus();
});
document.querySelectorAll(".example-chip").forEach((button) => {
  button.addEventListener("click", () => {
    sourceText.value = button.dataset.example;
    updateCount();
    setStatus("Пример добавлен. Нажмите «Перевести».");
    sourceText.focus();
  });
});
document.querySelector("#clearHistoryButton").addEventListener("click", () => {
  localStorage.removeItem("komok-history");
  renderHistory();
  setStatus("История очищена.", "success");
});
themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  document.body.dataset.theme = nextTheme;
  localStorage.setItem("komok-theme", nextTheme);
});

const savedTheme = localStorage.getItem("komok-theme");
if (savedTheme) document.body.dataset.theme = savedTheme;
updateCount();
renderHistory();
