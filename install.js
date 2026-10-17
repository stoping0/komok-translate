/* Komok Translate — кнопка «Скачать приложение», окно выбора платформы и PWA-установка.
 * Файл независим от app.js: подключается отдельным <script>, ничего из app.js не использует.
 */
(() => {
  "use strict";

  /* ======================================================================
   * НАСТРОЙКИ РЕЛИЗОВ — единственное место, где заданы имена файлов сборок.
   * Workflow сборки должен прикладывать к GitHub Release файлы ровно с этими
   * именами, тогда ссылки вида
   *   https://github.com/stoping0/komok-translate/releases/latest/download/<файл>
   * будут вести прямо на последнюю версию.
   * ====================================================================== */
  const RELEASE_REPO = "stoping0/komok-translate";
  const RELEASE_FILES = {
    android: "komok-translate.apk",           // Android APK
    windows: "komok-translate-setup.exe",     // Windows-установщик
    macos: "komok-translate.dmg",             // macOS (универсальный .dmg)
    linux: "komok-translate.AppImage",        // Linux AppImage
    linuxDeb: "komok-translate.deb"           // Linux .deb (Debian/Ubuntu), необязательный
  };
  const RELEASES_PAGE = `https://github.com/${RELEASE_REPO}/releases`;
  const RELEASE_API = `https://api.github.com/repos/${RELEASE_REPO}/releases/latest`;
  const downloadUrl = (file) => `https://github.com/${RELEASE_REPO}/releases/latest/download/${file}`;
  /* ====================================================================== */

  const INSTALLED_KEY = "komok-app-installed";
  const PLATFORMS = ["ios", "android", "windows", "macos", "linux"];
  const PLATFORM_LABELS = { ios: "iOS", android: "Android", windows: "Windows", macos: "macOS", linux: "Linux" };
  const ICONS = {
    ios: '<path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.8ZM14.1 5.8c.6-.8 1.1-1.8 1-2.8-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.7-1 2.7 1 .1 2-.5 2.6-1.3Z"/>',
    android: '<path d="M6 9h12v8a1 1 0 0 1-1 1h-1v3h-2v-3h-4v3H8v-3H7a1 1 0 0 1-1-1V9Zm-2 0h1v7H4V9Zm15 0h1v7h-1V9ZM6.2 8a6 6 0 0 1 3.1-4.5L8.3 2l.7-.5 1.1 1.6a6 6 0 0 1 3.8 0L15 1.5l.7.5-1 1.5A6 6 0 0 1 17.8 8H6.2ZM9.5 5.5a.7.7 0 1 0 0 1.4.7.7 0 0 0 0-1.4Zm5 0a.7.7 0 1 0 0 1.4.7.7 0 0 0 0-1.4Z"/>',
    windows: '<path d="M3 5.5 10.4 4.5v7H3v-6Zm8.4-1.1L21 3v8.5h-9.6V4.4ZM3 12.5h7.4v7L3 18.5v-6Zm8.4 0H21V21l-9.6-1.4v-7.1Z"/>',
    macos: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-6l1 2h2v1H7v-1h2l1-2H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2v8h14V7H5Z"/>',
    linux: '<path d="M12 2c-2.2 0-3.5 1.9-3.5 4.4 0 1.2.3 2.1-.4 3.3C7 11.5 5.5 13.6 5.6 16c-.6.4-1.4.8-1.4 1.6 0 1 1.4 1.1 2.2 1.6.9.6 1.4 1.8 2.6 1.8.9 0 1.4-.6 1.8-.9h2.4c.4.3.9.9 1.8.9 1.2 0 1.7-1.2 2.6-1.8.8-.5 2.2-.6 2.2-1.6 0-.8-.8-1.2-1.4-1.6.1-2.4-1.4-4.5-2.5-6.3-.7-1.2-.4-2.1-.4-3.3C15.5 3.9 14.2 2 12 2Zm-1.5 4a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Zm3 0a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6ZM12 8.6c.8 0 1.8.5 1.8.9s-1 1-1.8 1-1.8-.6-1.8-1 1-.9 1.8-.9Z"/>'
  };

  let deferredPrompt = null;
  let releaseAssets = null; // null — ещё не знаем; Set — имена файлов последнего релиза
  let releaseState = "unknown"; // unknown | loading | ready | missing | error
  let dialog = null;
  let currentPlatform = null;

  /* ---------- Определение платформы и установленного состояния ---------- */
  function detectPlatform() {
    const ua = navigator.userAgent || "";
    const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    if (/iPhone|iPad|iPod/i.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
    if (/Android/i.test(ua)) return "android";
    if (/Win/i.test(platform) || /Windows/i.test(ua)) return "windows";
    if (/Mac/i.test(platform) || /Mac OS X/i.test(ua)) return "macos";
    if (/Linux|X11|CrOS/i.test(platform + ua)) return "linux";
    return "windows";
  }
  const isIosSafari = () => {
    const ua = navigator.userAgent || "";
    return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|YaBrowser|OPiOS/i.test(ua);
  };

  function isRunningStandalone() {
    const modes = ["standalone", "fullscreen", "minimal-ui", "window-controls-overlay"];
    if (modes.some((mode) => window.matchMedia && window.matchMedia(`(display-mode: ${mode})`).matches)) return true;
    if (window.navigator.standalone === true) return true; // iOS Safari, добавлено на экран «Домой»
    if (window.__TAURI__ || window.__TAURI_INTERNALS__ || window.Capacitor) return true; // нативные оболочки
    if (document.referrer.startsWith("android-app://")) return true; // TWA
    return false;
  }
  const isInstalled = () => isRunningStandalone() || localStorage.getItem(INSTALLED_KEY) === "1";

  function updateButtons() {
    const hide = isInstalled();
    document.querySelectorAll("[data-download-app]").forEach((button) => {
      button.hidden = hide;
      button.classList.toggle("hidden", hide);
    });
    if (hide && dialog && dialog.open) dialog.close();
  }

  function markInstalled() {
    try { localStorage.setItem(INSTALLED_KEY, "1"); } catch { /* приватный режим */ }
    updateButtons();
  }

  /* ---------- Релизы GitHub ---------- */
  async function loadRelease() {
    if (releaseState === "loading" || releaseState === "ready" || releaseState === "missing") return;
    releaseState = "loading";
    try {
      const cached = sessionStorage.getItem("komok-release-assets");
      if (cached) {
        releaseAssets = new Set(JSON.parse(cached));
      } else {
        const response = await fetch(RELEASE_API, { headers: { Accept: "application/vnd.github+json" } });
        if (response.status === 404) { releaseAssets = new Set(); }
        else if (!response.ok) throw new Error(`HTTP ${response.status}`);
        else {
          const data = await response.json();
          releaseAssets = new Set((data.assets || []).map((asset) => asset.name));
        }
        sessionStorage.setItem("komok-release-assets", JSON.stringify([...releaseAssets]));
      }
      releaseState = releaseAssets.size ? "ready" : "missing";
    } catch {
      releaseState = "error";
    }
    if (dialog && dialog.open) renderPanel(currentPlatform);
  }
  const hasFile = (file) => releaseAssets instanceof Set && releaseAssets.has(file);

  /* ---------- Разметка ---------- */
  const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${ICONS[name]}</svg>`;
  const steps = (items) => `<ol class="install-steps">${items.map((item) => `<li>${item}</li>`).join("")}</ol>`;

  function pwaBlock(text) {
    if (!deferredPrompt) return "";
    return `<div class="install-pwa">
      <p>${text}</p>
      <button type="button" class="install-primary" data-pwa-install>Установить веб-приложение</button>
    </div>`;
  }

  function fileBlock(file, label) {
    if (hasFile(file)) {
      return `<a class="install-primary" href="${downloadUrl(file)}" download rel="noopener">${label}</a>`;
    }
    if (releaseState === "loading" || releaseState === "unknown") {
      return `<span class="install-primary is-disabled" aria-disabled="true">Проверяем наличие сборки…</span>`;
    }
    const why = releaseState === "error"
      ? "Не удалось проверить, есть ли готовый файл. Откройте страницу загрузок и выберите его вручную."
      : "Установочный файл для этой платформы ещё готовится. Как только он появится, ссылка заработает здесь же.";
    return `<p class="install-note">${why}</p>
      <a class="install-secondary" href="${RELEASES_PAGE}" target="_blank" rel="noopener">Открыть страницу загрузок</a>`;
  }

  const PANELS = {
    ios: () => {
      const notSafari = isIosSafari() ? "" : `<p class="install-note">На iPhone и iPad установить приложение можно только через <b>Safari</b>. Откройте эту страницу в Safari и повторите шаги.</p>`;
      return `<h3>Установка на iPhone и iPad</h3>
        <p>Komok Translate ставится как веб-приложение (PWA): появится иконка на экране «Домой», а приложение откроется в отдельном окне без адресной строки и будет работать офлайн.</p>
        ${notSafari}
        ${steps([
          "Откройте эту страницу в <b>Safari</b>.",
          "Нажмите кнопку <b>«Поделиться»</b> (квадрат со стрелкой вверх) внизу экрана или вверху на iPad.",
          "Пролистайте меню и выберите <b>«На экран „Домой“»</b>.",
          "Нажмите <b>«Добавить»</b> в правом верхнем углу.",
          "Запускайте Komok Translate с новой иконки на экране «Домой»."
        ])}`;
    },
    android: () => `<h3>Установка на Android</h3>
      ${pwaBlock("Самый быстрый способ — установить веб-приложение прямо из браузера, без скачивания файлов.")}
      <p>Или скачайте APK-файл:</p>
      ${fileBlock(RELEASE_FILES.android, "Скачать APK для Android")}
      ${steps([
        "Нажмите кнопку выше и дождитесь загрузки файла <code>" + RELEASE_FILES.android + "</code>.",
        "Откройте файл из уведомления или из папки «Загрузки».",
        "Если появится предупреждение, нажмите <b>«Настройки»</b> и включите <b>«Разрешить установку из этого источника»</b>.",
        "Вернитесь назад и нажмите <b>«Установить»</b>.",
        "Откройте Komok Translate из списка приложений."
      ])}
      ${deferredPrompt ? "" : `<p class="install-note">Также можно установить веб-приложение: в Chrome откройте меню <b>⋮</b> → <b>«Установить приложение»</b> (или «Добавить на главный экран»).</p>`}`,
    windows: () => `<h3>Установка на Windows</h3>
      ${fileBlock(RELEASE_FILES.windows, "Скачать для Windows (.exe)")}
      ${steps([
        "Скачайте установщик <code>" + RELEASE_FILES.windows + "</code>.",
        "Запустите файл из папки «Загрузки».",
        "Если появится окно <b>«Windows защитила ваш компьютер»</b>, нажмите <b>«Подробнее»</b> → <b>«Выполнить в любом случае»</b> (установщик пока не подписан сертификатом).",
        "Следуйте шагам мастера установки и нажмите <b>«Готово»</b>.",
        "Komok Translate появится в меню «Пуск» и на рабочем столе."
      ])}
      ${pwaBlock("Или установите веб-приложение через браузер — без установщика:")}
      ${deferredPrompt ? "" : `<p class="install-note">Без установщика: в Chrome или Edge нажмите значок установки в адресной строке (монитор со стрелкой) или меню → <b>«Установить Komok Translate»</b>.</p>`}`,
    macos: () => `<h3>Установка на macOS</h3>
      ${fileBlock(RELEASE_FILES.macos, "Скачать для macOS (.dmg)")}
      ${steps([
        "Скачайте файл <code>" + RELEASE_FILES.macos + "</code> и откройте его.",
        "Перетащите иконку <b>Komok Translate</b> в папку <b>«Программы»</b>.",
        "При первом запуске, если macOS сообщит, что разработчик не подтверждён: нажмите на приложение правой кнопкой → <b>«Открыть»</b> → <b>«Открыть»</b> (или <b>Системные настройки → Конфиденциальность и безопасность → «Всё равно открыть»</b>).",
        "Готово — приложение доступно в Launchpad и в Dock."
      ])}
      ${pwaBlock("Или установите веб-приложение через браузер:")}
      ${deferredPrompt ? "" : `<p class="install-note">Без скачивания: в Safari (macOS Sonoma и новее) выберите <b>Файл → «Добавить в Dock»</b>; в Chrome — значок установки в адресной строке.</p>`}`,
    linux: () => `<h3>Установка на Linux</h3>
      ${fileBlock(RELEASE_FILES.linux, "Скачать AppImage")}
      ${steps([
        "Скачайте файл <code>" + RELEASE_FILES.linux + "</code>.",
        "Сделайте его исполняемым: правой кнопкой → <b>Свойства → Права → «Разрешить выполнение»</b>, или в терминале: <code>chmod +x " + RELEASE_FILES.linux + "</code>.",
        "Запустите двойным щелчком или командой <code>./" + RELEASE_FILES.linux + "</code>."
      ])}
      ${hasFile(RELEASE_FILES.linuxDeb) ? `<p>Для Debian/Ubuntu есть пакет .deb: <a href="${downloadUrl(RELEASE_FILES.linuxDeb)}" download rel="noopener">скачать ${RELEASE_FILES.linuxDeb}</a>, затем <code>sudo apt install ./${RELEASE_FILES.linuxDeb}</code>.</p>` : ""}
      ${pwaBlock("Или установите веб-приложение через браузер:")}
      ${deferredPrompt ? "" : `<p class="install-note">Без скачивания: в Chrome или Chromium нажмите значок установки в адресной строке или меню → <b>«Установить Komok Translate»</b>.</p>`}`
  };

  function buildDialog() {
    dialog = document.createElement("dialog");
    dialog.className = "install-dialog";
    dialog.setAttribute("aria-labelledby", "installDialogTitle");
    dialog.innerHTML = `
      <div class="install-card">
        <div class="install-head">
          <img src="assets/icon-192.png" alt="" width="44" height="44" />
          <div>
            <h2 id="installDialogTitle">Скачать Komok Translate</h2>
            <p>Выберите устройство — мы подсветили ваше.</p>
          </div>
          <button type="button" class="install-close" data-install-close aria-label="Закрыть">×</button>
        </div>
        <div class="install-tabs" role="tablist" aria-label="Платформа">
          ${PLATFORMS.map((platform) => `<button type="button" role="tab" class="install-tab" id="install-tab-${platform}" data-platform="${platform}" aria-controls="installPanel">${icon(platform)}<span>${PLATFORM_LABELS[platform]}</span><small class="install-badge">ваше</small></button>`).join("")}
        </div>
        <div class="install-panel" id="installPanel" role="tabpanel" tabindex="0"></div>
      </div>`;
    document.body.appendChild(dialog);

    const detected = detectPlatform();
    dialog.querySelector(`[data-platform="${detected}"]`).classList.add("is-detected");

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog || event.target.closest("[data-install-close]")) { dialog.close(); return; }
      const tab = event.target.closest("[data-platform]");
      if (tab) { renderPanel(tab.dataset.platform); return; }
      if (event.target.closest("[data-pwa-install]")) promptPwaInstall();
    });
    dialog.querySelector(".install-tabs").addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      const index = PLATFORMS.indexOf(currentPlatform);
      const next = PLATFORMS[(index + (event.key === "ArrowRight" ? 1 : PLATFORMS.length - 1)) % PLATFORMS.length];
      renderPanel(next);
      dialog.querySelector(`[data-platform="${next}"]`).focus();
    });
  }

  function renderPanel(platform) {
    currentPlatform = platform;
    dialog.querySelectorAll("[data-platform]").forEach((tab) => {
      const active = tab.dataset.platform === platform;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    const panel = dialog.querySelector("#installPanel");
    panel.setAttribute("aria-labelledby", `install-tab-${platform}`);
    panel.innerHTML = PANELS[platform]();
  }

  function openDialog() {
    if (!dialog) buildDialog();
    renderPanel(currentPlatform || detectPlatform());
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
    loadRelease();
  }

  async function promptPwaInstall() {
    if (!deferredPrompt) return;
    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    promptEvent.prompt();
    try {
      const choice = await promptEvent.userChoice;
      if (choice && choice.outcome === "accepted") markInstalled();
    } catch { /* пользователь закрыл окно */ }
    if (dialog && dialog.open) renderPanel(currentPlatform);
  }

  /* ---------- События ---------- */
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    // Браузер предлагает установку — значит, PWA сейчас не установлено (например, его удалили).
    try { localStorage.removeItem(INSTALLED_KEY); } catch { /* ignore */ }
    updateButtons();
    if (dialog && dialog.open) renderPanel(currentPlatform);
  });
  window.addEventListener("appinstalled", markInstalled);
  if (window.matchMedia) {
    const media = window.matchMedia("(display-mode: standalone)");
    if (media.addEventListener) media.addEventListener("change", updateButtons);
  }
  if (isRunningStandalone()) markInstalled();

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-download-app]")) { event.preventDefault(); openDialog(); }
  });
  updateButtons();

  /* ---------- Service worker (относительный путь — работает под /komok-translate/) ---------- */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js", { scope: "./" }).catch((error) => console.warn("Service worker не зарегистрирован:", error));
    });
  }

  // Для отладки и для команды сборок.
  window.KomokInstall = { RELEASE_FILES, downloadUrl, open: openDialog, detectPlatform, isInstalled };
})();
