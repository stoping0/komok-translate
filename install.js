// Komok Translate — "Download app" button, platform picker and install detection.
(() => {
  const RELEASES = "https://github.com/stoping0/komok-translate/releases/latest/download/";
  const FILES = {
    android: "Komok-Translate.apk",
    windows: "Komok-Translate-Setup.exe",
    macos: "Komok-Translate-macOS.zip",
    linux: "Komok-Translate.AppImage"
  };
  const INSTALLED_KEY = "komok-app-installed";
  let deferredPrompt = null;

  const text = {
    en: {
      download: "Download app", title: "Install Komok Translate", subtitle: "Pick your device. We detected it automatically.",
      detected: "your device", close: "Close", install_now: "Install now", download_file: "Download",
      done: "App installed. You can open it from your home screen or app list.",
      ios: { name: "iPhone / iPad", kind: "Web app (PWA)", steps: ["Open this page in Safari.", "Tap the Share button at the bottom of the screen.", "Choose “Add to Home Screen”.", "Tap “Add”. Komok appears on your home screen and opens like a normal app."] },
      android: { name: "Android", kind: "APK file", steps: ["Tap “Download” to get the APK file.", "Open the downloaded file from notifications or the Downloads folder.", "If Android asks, allow installing apps from this source (Settings → Install unknown apps).", "Tap “Install”, then “Open”."], alt: "Or tap “Install now” to add Komok straight from Chrome." },
      windows: { name: "Windows", kind: "EXE installer", steps: ["Click “Download” to get Komok-Translate-Setup.exe.", "Run the file. If SmartScreen appears, click “More info” → “Run anyway”.", "Follow the installer. Komok appears in the Start menu and on the desktop."], alt: "Or click “Install now” to add Komok from Chrome or Edge." },
      macos: { name: "macOS", kind: "App (ZIP)", steps: ["Click “Download” and open the ZIP file.", "Drag “Komok Translate” into the Applications folder.", "On first launch, right-click the app → “Open”, then confirm “Open”."], alt: "Or click “Install now” in Chrome, or in Safari choose File → Add to Dock." },
      linux: { name: "Linux", kind: "AppImage", steps: ["Click “Download” to get Komok-Translate.AppImage.", "Make it executable: right-click → Properties → Allow executing, or run chmod +x Komok-Translate.AppImage.", "Double-click the file to start Komok."], alt: "Or click “Install now” to add Komok from Chrome." }
    },
    ru: {
      download: "Скачать приложение", title: "Установить Komok Translate", subtitle: "Выберите устройство. Мы определили его автоматически.",
      detected: "ваше устройство", close: "Закрыть", install_now: "Установить сразу", download_file: "Скачать",
      done: "Приложение установлено. Его можно открыть с главного экрана или из списка приложений.",
      ios: { name: "iPhone / iPad", kind: "Веб-приложение (PWA)", steps: ["Откройте эту страницу в Safari.", "Нажмите кнопку «Поделиться» внизу экрана.", "Выберите «На экран „Домой“».", "Нажмите «Добавить». Komok появится на главном экране и будет открываться как обычное приложение."] },
      android: { name: "Android", kind: "APK-файл", steps: ["Нажмите «Скачать», чтобы загрузить APK-файл.", "Откройте скачанный файл из уведомлений или папки «Загрузки».", "Если Android спросит, разрешите установку из этого источника (Настройки → Установка неизвестных приложений).", "Нажмите «Установить», затем «Открыть»."], alt: "Или нажмите «Установить сразу», чтобы добавить Komok прямо из Chrome." },
      windows: { name: "Windows", kind: "Установщик EXE", steps: ["Нажмите «Скачать», чтобы загрузить Komok-Translate-Setup.exe.", "Запустите файл. Если появится SmartScreen, нажмите «Подробнее» → «Выполнить в любом случае».", "Пройдите установку. Komok появится в меню «Пуск» и на рабочем столе."], alt: "Или нажмите «Установить сразу», чтобы добавить Komok из Chrome или Edge." },
      macos: { name: "macOS", kind: "Приложение (ZIP)", steps: ["Нажмите «Скачать» и откройте ZIP-файл.", "Перетащите «Komok Translate» в папку «Программы».", "При первом запуске нажмите на приложение правой кнопкой → «Открыть» и подтвердите."], alt: "Или нажмите «Установить сразу» в Chrome, а в Safari выберите «Файл» → «Добавить в Dock»." },
      linux: { name: "Linux", kind: "AppImage", steps: ["Нажмите «Скачать», чтобы загрузить Komok-Translate.AppImage.", "Сделайте файл исполняемым: правый клик → «Свойства» → «Разрешить запуск», или выполните chmod +x Komok-Translate.AppImage.", "Дважды щёлкните по файлу, чтобы запустить Komok."], alt: "Или нажмите «Установить сразу», чтобы добавить Komok из Chrome." }
    }
  };
  const PLATFORMS = ["ios", "android", "windows", "macos", "linux"];
  const ICONS = {
    ios: '<path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.8ZM14.1 5.8c.6-.8 1.1-1.8 1-2.9-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3Z"/>',
    android: '<path d="M6 9h12v8a1 1 0 0 1-1 1h-1v3h-2v-3h-4v3H8v-3H7a1 1 0 0 1-1-1V9Zm-3 0h2v6H3V9Zm16 0h2v6h-2V9ZM7.5 3l1.3 2A6 6 0 0 0 6 8h12a6 6 0 0 0-2.8-3l1.3-2-.6-.4-1.4 2.1a6 6 0 0 0-5 0L8.1 2.6l-.6.4ZM9.5 6.5a.6.6 0 1 1 0 1.2.6.6 0 0 1 0-1.2Zm5 0a.6.6 0 1 1 0 1.2.6.6 0 0 1 0-1.2Z"/>',
    windows: '<path d="M3 5.5 10.5 4.5v7H3v-6Zm8.5-1.2L21 3v8.5h-9.5V4.3ZM3 12.5h7.5v7L3 18.5v-6Zm8.5 0H21V21l-9.5-1.3v-7.2Z"/>',
    macos: '<path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-6l1 2h2v1H7v-1h2l1-2H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm1 2v9h14V6H5Z"/>',
    linux: '<path d="M12 2c-2.2 0-3.5 1.9-3.5 4.4 0 1.5.4 2.4.1 3.4-.4 1.3-2.6 3.4-3.1 6-.3 1.6.6 2.4 1.6 2.4.6 1.3 2 2.3 4.9 2.3s4.3-1 4.9-2.3c1 0 1.9-.8 1.6-2.4-.5-2.6-2.7-4.7-3.1-6-.3-1 .1-1.9.1-3.4C15.5 3.9 14.2 2 12 2Zm-1.6 4a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Zm3.2 0a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6ZM12 8.6l1.6.9-1.6.9-1.6-.9 1.6-.9Z"/>'
  };

  const lang = () => ((document.documentElement.lang || "en").toLowerCase().startsWith("ru") || (document.documentElement.lang || "").startsWith("uk") ? "ru" : "en");
  const t = () => text[lang()];

  function detectPlatform() {
    const ua = navigator.userAgent || "";
    const platform = navigator.userAgentData?.platform || navigator.platform || "";
    if (/iPhone|iPad|iPod/i.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
    if (/Android/i.test(ua)) return "android";
    if (/Win/i.test(platform) || /Windows/i.test(ua)) return "windows";
    if (/Mac/i.test(platform) || /Mac OS X/i.test(ua)) return "macos";
    if (/Linux|X11|CrOS/i.test(platform + ua)) return "linux";
    return "windows";
  }

  function isInstalled() {
    return window.matchMedia("(display-mode: standalone)").matches
      || window.matchMedia("(display-mode: window-controls-overlay)").matches
      || window.matchMedia("(display-mode: fullscreen)").matches
      || window.navigator.standalone === true
      || /KomokDesktop|Electron/i.test(navigator.userAgent)
      || document.referrer.startsWith("android-app://")
      || localStorage.getItem(INSTALLED_KEY) === "1";
  }

  // --- UI -------------------------------------------------------------------
  const svg = (inner) => `<svg viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
  const downloadIcon = svg('<path d="M12 3v12m0 0 5-5m-5 5-5-5M4 19h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>');

  function makeButton(extraClass) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `install-button ${extraClass}`;
    button.innerHTML = `${downloadIcon}<span class="install-button__label"></span>`;
    button.addEventListener("click", () => openDialog());
    return button;
  }

  const buttons = [makeButton("install-button--topbar"), makeButton("install-button--auth")];
  document.querySelector(".topbar-actions")?.prepend(buttons[0]);
  document.querySelector(".auth-card")?.append(buttons[1]);

  const dialog = document.createElement("dialog");
  dialog.className = "install-dialog";
  dialog.setAttribute("aria-labelledby", "installTitle");
  document.body.append(dialog);
  let current = detectPlatform();

  function render() {
    const d = t();
    const p = d[current];
    const detected = detectPlatform();
    const tabs = PLATFORMS.map((id) => `
      <button type="button" role="tab" class="install-tab${id === current ? " is-active" : ""}" data-platform="${id}" aria-selected="${id === current}">
        ${svg(ICONS[id])}<span>${d[id].name}</span>${id === detected ? `<small>${d.detected}</small>` : ""}
      </button>`).join("");
    const steps = p.steps.map((step) => `<li>${step}</li>`).join("");
    const file = FILES[current];
    const canPrompt = Boolean(deferredPrompt) && current === detected && current !== "ios";
    dialog.innerHTML = `
      <form method="dialog" class="install-dialog__inner">
        <header class="install-dialog__header">
          <img src="assets/icons/icon-192.png" alt="" />
          <div><h2 id="installTitle">${d.title}</h2><p>${d.subtitle}</p></div>
          <button class="install-close" value="close" aria-label="${d.close}">×</button>
        </header>
        <div class="install-tabs" role="tablist">${tabs}</div>
        <section class="install-panel" role="tabpanel">
          <div class="install-kind">${p.kind}</div>
          <ol class="install-steps">${steps}</ol>
          ${p.alt && canPrompt ? `<p class="install-alt">${p.alt}</p>` : ""}
          <div class="install-actions">
            ${canPrompt ? `<button type="button" class="install-primary" data-action="prompt">${d.install_now}</button>` : ""}
            ${file ? `<a class="${canPrompt ? "install-secondary" : "install-primary"}" href="${RELEASES}${file}" download>${downloadIcon}<span>${d.download_file} ${file.split(".").pop().toUpperCase()}</span></a>` : ""}
          </div>
        </section>
      </form>`;
    dialog.querySelectorAll(".install-tab").forEach((tab) => tab.addEventListener("click", () => { current = tab.dataset.platform; render(); }));
    dialog.querySelector('[data-action="prompt"]')?.addEventListener("click", promptInstall);
  }

  function openDialog() {
    current = detectPlatform();
    render();
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
  }
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

  async function promptInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (outcome === "accepted") markInstalled(); else render();
  }

  function markInstalled() {
    localStorage.setItem(INSTALLED_KEY, "1");
    refresh();
    if (dialog.open) {
      dialog.querySelector(".install-panel").innerHTML = `<p class="install-done">${t().done}</p>`;
      setTimeout(() => dialog.open && dialog.close(), 2500);
    }
  }

  function refresh() {
    const hide = isInstalled();
    buttons.forEach((button) => {
      button.hidden = hide;
      button.querySelector(".install-button__label").textContent = t().download;
    });
  }

  // --- Events ---------------------------------------------------------------
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    // The browser only offers the prompt when the PWA is NOT installed, so clear a stale flag.
    localStorage.removeItem(INSTALLED_KEY);
    refresh();
    if (dialog.open) render();
  });
  window.addEventListener("appinstalled", markInstalled);
  window.matchMedia("(display-mode: standalone)").addEventListener?.("change", refresh);
  new MutationObserver(() => { refresh(); if (dialog.open) render(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  // Chrome/Edge can tell us if the PWA is already installed on this device.
  if (navigator.getInstalledRelatedApps) {
    navigator.getInstalledRelatedApps().then((apps) => { if (apps.length) { localStorage.setItem(INSTALLED_KEY, "1"); refresh(); } }).catch(() => {});
  }

  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  window.KomokInstall = { open: openDialog, isInstalled };
  refresh();
})();
