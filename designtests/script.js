const root = document.documentElement;
const toast = document.getElementById("toast");
const modal = document.getElementById("demo-modal");

const applyTheme = (theme) => {
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    localStorage.setItem("designThemePreference", "system");
    return;
  }

  root.setAttribute("data-theme", theme);
  localStorage.setItem("designThemePreference", theme);
};

const savedTheme = localStorage.getItem("designThemePreference") || "system";
applyTheme(savedTheme);

for (const button of document.querySelectorAll("[data-set-theme]")) {
  button.addEventListener("click", () => {
    applyTheme(button.dataset.setTheme);
  });
}

const select = document.getElementById("profile-theme-select");
if (select) {
  select.value = savedTheme;
}

document.getElementById("apply-profile-theme")?.addEventListener("click", () => {
  applyTheme(select.value);
  showToast();
});

document.getElementById("open-modal")?.addEventListener("click", () => {
  modal.showModal();
});

document.getElementById("close-modal")?.addEventListener("click", () => {
  modal.close();
});

document.getElementById("show-toast")?.addEventListener("click", () => {
  showToast();
});

function showToast() {
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if ((localStorage.getItem("designThemePreference") || "system") === "system") {
    applyTheme("system");
  }
});
