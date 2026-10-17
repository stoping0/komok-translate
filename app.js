const languageGroups = [
  { label: "Europe", options: [["ru", "Русский"], ["en", "English"], ["uk", "Українська"], ["de", "Deutsch"], ["fr", "Français"], ["es", "Español"], ["it", "Italiano"], ["pt", "Português"], ["nl", "Nederlands"], ["pl", "Polski"], ["cs", "Čeština"], ["sk", "Slovenčina"], ["sl", "Slovenščina"], ["hr", "Hrvatski"], ["sr", "Српски"], ["bg", "Български"], ["ro", "Română"], ["hu", "Magyar"], ["el", "Ελληνικά"], ["sv", "Svenska"], ["no", "Norsk"], ["da", "Dansk"], ["fi", "Suomi"], ["et", "Eesti"], ["lv", "Latviešu"], ["lt", "Lietuvių"], ["is", "Íslenska"], ["ga", "Gaeilge"], ["tr", "Türkçe"]] },
  { label: "Asia", options: [["zh-CN", "中文 — 简体"], ["zh-TW", "中文 — 繁體"], ["ja", "日本語"], ["ko", "한국어"], ["hi", "हिन्दी"], ["bn", "বাংলা"], ["th", "ไทย"], ["vi", "Tiếng Việt"], ["id", "Bahasa Indonesia"], ["ms", "Bahasa Melayu"], ["fil", "Filipino"], ["ta", "தமிழ்"], ["te", "తెలుగు"], ["ml", "മലയാളം"], ["ur", "اردو"], ["fa", "فارسی"], ["he", "עברית"], ["ar", "العربية"], ["ka", "ქართული"], ["hy", "Հայերեն"], ["az", "Azərbaycanca"], ["kk", "Қазақша"], ["uz", "O‘zbekcha"], ["mn", "Монгол"], ["my", "မြန်မာ"]] }
];
const allLanguages = () => languageGroups.flatMap((group) => group.options);
const languageName = (code) => code === "auto" ? "Auto-detect" : allLanguages().find(([value]) => value === code)?.[1] || code;
const $ = (selector) => document.querySelector(selector);
const OAUTH_SERVER_ORIGIN = "https://komok-mdzgrwkk.manus.space";
const ON_GITHUB_PAGES = window.location.hostname.endsWith("github.io");
const uiLanguage = $("#uiLanguage");
const sourceLang = $("#sourceLang");
const targetLang = $("#targetLang");
const sourceText = $("#sourceText");
const translationOutput = $("#translationOutput");
const statusMessage = $("#statusMessage");
const charCount = $("#charCount");
const resultLanguage = $("#resultLanguage");
const MAX_HISTORY = 5;
let isLoading = false;

const uiEnglish = {
  login_title: "Sign in to your account", login_subtitle: "Your translations stay close, private and ready when you are.", continue_github: "Continue with GitHub", login_note: "Only GitHub sign-in is available.", logout: "Log out", interface_language: "Interface language", translate_from: "Translate from", translate_to: "Translate to", source_text: "Source text", clear: "Clear", shortcut: "Ctrl / ⌘ + Enter — translate", translation: "Translation", copy: "Copy", result_placeholder: "Your translation will appear here", ready: "Ready to translate", translate: "Translate", try_example: "Try an example", recent: "Recent translations", clear_history: "Clear history", footer_note: "Made to help people understand each other."
};
const uiTranslations = {
  en: uiEnglish,
  ru: { login_title: "Войдите в аккаунт", login_subtitle: "Ваши переводы всегда рядом, в безопасности и готовы к работе.", continue_github: "Продолжить через GitHub", login_note: "Доступен только вход через GitHub.", logout: "Выйти", interface_language: "Язык интерфейса", translate_from: "Перевести с", translate_to: "Перевести на", source_text: "Исходный текст", clear: "Очистить", shortcut: "Ctrl / ⌘ + Enter — перевести", translation: "Перевод", copy: "Копировать", result_placeholder: "Перевод появится здесь", ready: "Готово к переводу", translate: "Перевести", try_example: "Попробуйте пример", recent: "Недавние переводы", clear_history: "Очистить историю", footer_note: "Сделано, чтобы помогать понимать друг друга." },
  de: { login_title: "In dein Konto einloggen", continue_github: "Mit GitHub fortfahren", logout: "Abmelden", translate_from: "Übersetzen von", translate_to: "Übersetzen nach", source_text: "Ausgangstext", clear: "Löschen", translation: "Übersetzung", copy: "Kopieren", ready: "Bereit zum Übersetzen", translate: "Übersetzen", try_example: "Beispiel ausprobieren", recent: "Letzte Übersetzungen", clear_history: "Verlauf löschen" },
  fr: { login_title: "Connectez-vous à votre compte", continue_github: "Continuer avec GitHub", logout: "Se déconnecter", translate_from: "Traduire de", translate_to: "Traduire vers", source_text: "Texte source", clear: "Effacer", translation: "Traduction", copy: "Copier", ready: "Prêt à traduire", translate: "Traduire", try_example: "Essayer un exemple", recent: "Traductions récentes", clear_history: "Effacer l’historique" },
  es: { login_title: "Inicia sesión en tu cuenta", continue_github: "Continuar con GitHub", logout: "Cerrar sesión", translate_from: "Traducir de", translate_to: "Traducir a", source_text: "Texto original", clear: "Borrar", translation: "Traducción", copy: "Copiar", ready: "Listo para traducir", translate: "Traducir", try_example: "Prueba un ejemplo", recent: "Traducciones recientes", clear_history: "Borrar historial" },
  it: { login_title: "Accedi al tuo account", continue_github: "Continua con GitHub", logout: "Esci", translate_from: "Traduci da", translate_to: "Traduci in", source_text: "Testo originale", clear: "Cancella", translation: "Traduzione", copy: "Copia", ready: "Pronto per tradurre", translate: "Traduci", try_example: "Prova un esempio", recent: "Traduzioni recenti", clear_history: "Cancella cronologia" },
  pt: { login_title: "Entre na sua conta", continue_github: "Continuar com GitHub", logout: "Sair", translate_from: "Traduzir de", translate_to: "Traduzir para", source_text: "Texto original", clear: "Limpar", translation: "Tradução", copy: "Copiar", ready: "Pronto para traduzir", translate: "Traduzir", try_example: "Experimente um exemplo", recent: "Traduções recentes", clear_history: "Limpar histórico" },
  uk: { login_title: "Увійдіть до акаунта", continue_github: "Продовжити через GitHub", logout: "Вийти", translate_from: "Перекласти з", translate_to: "Перекласти на", source_text: "Вихідний текст", clear: "Очистити", translation: "Переклад", copy: "Копіювати", ready: "Готово до перекладу", translate: "Перекласти", try_example: "Спробуйте приклад", recent: "Останні переклади", clear_history: "Очистити історію" },
  pl: { login_title: "Zaloguj się na konto", continue_github: "Kontynuuj z GitHub", logout: "Wyloguj się", translate_from: "Tłumacz z", translate_to: "Tłumacz na", source_text: "Tekst źródłowy", clear: "Wyczyść", translation: "Tłumaczenie", copy: "Kopiuj", ready: "Gotowe do tłumaczenia", translate: "Tłumacz", try_example: "Wypróbuj przykład", recent: "Ostatnie tłumaczenia", clear_history: "Wyczyść historię" },
  "zh-CN": { login_title: "登录您的账户", continue_github: "使用 GitHub 继续", logout: "退出登录", translate_from: "翻译自", translate_to: "翻译为", source_text: "原文", clear: "清除", translation: "译文", copy: "复制", ready: "准备翻译", translate: "翻译", try_example: "试试示例", recent: "最近翻译", clear_history: "清除历史" },
  ja: { login_title: "アカウントにログイン", continue_github: "GitHubで続ける", logout: "ログアウト", translate_from: "翻訳元", translate_to: "翻訳先", source_text: "原文", clear: "クリア", translation: "翻訳", copy: "コピー", ready: "翻訳の準備完了", translate: "翻訳", try_example: "例を試す", recent: "最近の翻訳", clear_history: "履歴を消去" },
  ko: { login_title: "계정에 로그인", continue_github: "GitHub로 계속", logout: "로그아웃", translate_from: "번역 원문", translate_to: "번역 언어", source_text: "원문", clear: "지우기", translation: "번역", copy: "복사", ready: "번역 준비 완료", translate: "번역", try_example: "예시 사용", recent: "최근 번역", clear_history: "기록 지우기" },
  "zh-TW": { login_title: "登入您的帳戶", continue_github: "使用 GitHub 繼續", logout: "登出", translate_from: "翻譯來源", translate_to: "翻譯目標", source_text: "原文", clear: "清除", translation: "翻譯", copy: "複製", ready: "準備翻譯", translate: "翻譯", try_example: "試試範例", recent: "最近翻譯", clear_history: "清除紀錄" }
};

function fillLanguages(select, includeAuto = false) {
  if (includeAuto) { const option = document.createElement("option"); option.value = "auto"; option.textContent = "Auto-detect"; select.appendChild(option); }
  languageGroups.forEach(({ label, options }) => { const group = document.createElement("optgroup"); group.label = label; options.forEach(([code, labelText]) => { const option = document.createElement("option"); option.value = code; option.textContent = labelText; group.appendChild(option); }); select.appendChild(group); });
}
fillLanguages(uiLanguage); fillLanguages(sourceLang, true); fillLanguages(targetLang);
uiLanguage.value = localStorage.getItem("komok-ui-language") || "en";
sourceLang.value = "auto"; targetLang.value = "en";

function setStatus(message = "", kind = "") { statusMessage.textContent = message; statusMessage.className = `status-message${kind ? ` is-${kind}` : ""}`; }
function updateCount() { charCount.textContent = `${sourceText.value.length} / 5000`; }
function applyDictionary(dictionary) { document.querySelectorAll("[data-i18n]").forEach((element) => { const key = element.dataset.i18n; if (dictionary[key]) element.textContent = dictionary[key]; }); }
async function applyInterfaceLanguage(code) {
  localStorage.setItem("komok-ui-language", code); document.documentElement.lang = code; uiLanguage.value = code;
  const dictionary = uiTranslations[code] || uiEnglish; applyDictionary({ ...uiEnglish, ...dictionary });
  if (!uiTranslations[code] && code !== "en") {
    const keys = Object.keys(uiEnglish); const translated = { ...uiEnglish };
    await Promise.all(keys.map(async (key) => { try { translated[key] = await requestTranslation(uiEnglish[key], "en", code); } catch { /* English fallback keeps the interface usable. */ } }));
    uiTranslations[code] = translated; if (uiLanguage.value === code) applyDictionary({ ...uiEnglish, ...translated });
  }
}

function setLoading(value) { isLoading = value; const button = $("#translateButton"); button.classList.toggle("is-loading", value); button.querySelector(".button-label").textContent = value ? (uiTranslations[uiLanguage.value]?.translating || "Translating…") : (uiTranslations[uiLanguage.value]?.translate || "Translate"); button.querySelector(".button-arrow").style.display = value ? "none" : "block"; }
function saveHistory(source, result) { const entries = JSON.parse(localStorage.getItem("komok-history") || "[]"); entries.unshift({ source, result, from: sourceLang.value, to: targetLang.value }); localStorage.setItem("komok-history", JSON.stringify(entries.slice(0, MAX_HISTORY))); renderHistory(); }
function renderHistory() { const section = $("#historySection"); const list = $("#historyList"); const entries = JSON.parse(localStorage.getItem("komok-history") || "[]"); list.innerHTML = ""; section.classList.toggle("hidden", entries.length === 0); entries.forEach((entry) => { const row = document.createElement("button"); row.type = "button"; row.className = "history-item"; const from = document.createElement("span"); from.textContent = entry.source; const to = document.createElement("span"); to.textContent = entry.result; row.append(from, to); row.addEventListener("click", () => { sourceText.value = entry.source; translationOutput.textContent = entry.result; translationOutput.classList.remove("is-empty"); sourceLang.value = entry.from; targetLang.value = entry.to; resultLanguage.textContent = languageName(entry.to); updateCount(); }); list.appendChild(row); }); }

async function requestTranslation(text, from, to) { const endpoint = new URL("https://api.mymemory.translated.net/get"); endpoint.searchParams.set("q", text); endpoint.searchParams.set("langpair", `${from === "auto" ? "autodetect" : from}|${to}`); const response = await fetch(endpoint, { headers: { Accept: "application/json" } }); if (!response.ok) throw new Error(`HTTP ${response.status}`); const data = await response.json(); const translated = data?.responseData?.translatedText; if (!translated || data.responseStatus === 403) throw new Error("Translation unavailable"); return translated; }
async function translate() { const text = sourceText.value.trim(); const from = sourceLang.value; const to = targetLang.value; if (isLoading) return; if (!text) return setStatus("Enter text to translate.", "error"); if (from !== "auto" && from === to) return setStatus("Choose different languages.", "error"); setLoading(true); setStatus("Connecting to the translation service…"); try { const result = await requestTranslation(text, from, to); translationOutput.textContent = result; translationOutput.classList.remove("is-empty"); resultLanguage.textContent = languageName(to); setStatus("Translation ready.", "success"); saveHistory(text, result); } catch { setStatus("Translation failed. Check your connection and try again.", "error"); } finally { setLoading(false); } }
function swapLanguages() { if (sourceLang.value === "auto") return setStatus("Choose a source language before swapping.", "error"); const previous = sourceLang.value; sourceLang.value = targetLang.value; targetLang.value = previous; if (!translationOutput.classList.contains("is-empty")) { const oldSource = sourceText.value; sourceText.value = translationOutput.textContent; translationOutput.textContent = oldSource || "Your translation will appear here"; translationOutput.classList.toggle("is-empty", !oldSource); } resultLanguage.textContent = languageName(targetLang.value); updateCount(); }
async function copyResult() { const text = translationOutput.classList.contains("is-empty") ? "" : translationOutput.textContent; if (!text) return setStatus("Nothing to copy yet.", "error"); await navigator.clipboard.writeText(text); setStatus("Translation copied.", "success"); }

function showLogin(message = "") { $("#loginScreen").classList.remove("hidden"); $("#appShell").classList.add("hidden"); if (message) { $("#authError").textContent = message; $("#authError").classList.remove("hidden"); } }
function showApp(user) { $("#loginScreen").classList.add("hidden"); $("#appShell").classList.remove("hidden"); $("#userName").textContent = user.name || user.login; $("#userAvatar").src = user.avatar || "assets/komok-translate-icon.jpeg"; }
async function initAuth() { try { const response = await fetch("/api/me", { credentials: "include" }); const data = await response.json(); if (data.user) showApp(data.user); else showLogin(); } catch { showLogin("Sign in is available on the secure Komok server."); } }

function forwardOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  if (!ON_GITHUB_PAGES || !params.get("code") || !params.get("state")) return false;
  window.location.replace(`${OAUTH_SERVER_ORIGIN}/api/auth/github/callback?code=${encodeURIComponent(params.get("code"))}&state=${encodeURIComponent(params.get("state"))}`);
  return true;
}

$("#githubLoginButton").addEventListener("click", () => { window.location.href = `${ON_GITHUB_PAGES ? OAUTH_SERVER_ORIGIN : ""}/api/auth/github`; });
$("#logoutButton").addEventListener("click", async () => { await fetch("/api/logout", { method: "POST", credentials: "include" }); showLogin(); });
uiLanguage.addEventListener("change", () => applyInterfaceLanguage(uiLanguage.value));
sourceText.addEventListener("input", () => { updateCount(); setStatus(""); });
sourceText.addEventListener("keydown", (event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") translate(); });
targetLang.addEventListener("change", () => { resultLanguage.textContent = languageName(targetLang.value); });
$("#translateButton").addEventListener("click", translate); $("#swapButton").addEventListener("click", swapLanguages); $("#copyButton").addEventListener("click", copyResult);
$("#clearButton").addEventListener("click", () => { sourceText.value = ""; translationOutput.textContent = "Your translation will appear here"; translationOutput.classList.add("is-empty"); updateCount(); setStatus(""); sourceText.focus(); });
document.querySelectorAll(".example-chip").forEach((button) => button.addEventListener("click", () => { sourceText.value = button.dataset.example; updateCount(); setStatus("Example added. Press Translate."); sourceText.focus(); }));
$("#clearHistoryButton").addEventListener("click", () => { localStorage.removeItem("komok-history"); renderHistory(); });
$("#themeToggle").addEventListener("click", () => { const next = document.body.dataset.theme === "dark" ? "light" : "dark"; document.body.dataset.theme = next; localStorage.setItem("komok-theme", next); });

const savedTheme = localStorage.getItem("komok-theme"); if (savedTheme) document.body.dataset.theme = savedTheme;
if (!forwardOAuthCallback()) { applyInterfaceLanguage(uiLanguage.value); updateCount(); renderHistory(); initAuth(); }
