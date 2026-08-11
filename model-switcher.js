const DB_NAME = "galaxy-db";
const originalFetch = window.fetch.bind(window);
let selectedModel = "";
let modelIds = [];
let activeEndpointKey = "";
let selector = null;
let loadingModels = false;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readAll(storeName) {
  return openDatabase().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  }));
}

async function findActiveEndpoint() {
  const [endpoints, preferences] = await Promise.all([
    readAll("endpoints"),
    readAll("preferences"),
  ]);
  const activeId = preferences.find((item) => item.key === "activeEndpointId")?.value;
  return endpoints.find((endpoint) => endpoint.id === activeId) || endpoints[0] || null;
}

function ensureToolbar() {
  if (selector || !document.body) return;

  const toolbar = document.createElement("div");
  toolbar.id = "galaxy-model-toolbar";
  toolbar.style.cssText = [
    "position:fixed", "top:8px", "right:16px", "z-index:2147483647",
    "display:flex", "align-items:center", "gap:8px", "padding:5px 8px",
    "background:var(--color-surface,#13161A)", "border:1px solid var(--color-border,#252A31)",
    "border-radius:6px", "box-shadow:0 4px 12px rgba(0,0,0,.4)", "font:12px monospace",
  ].join(";");

  const label = document.createElement("span");
  label.textContent = "Model";
  label.style.color = "var(--color-text-secondary,#8E96A3)";
  selector = document.createElement("select");
  selector.title = "Model used for the next message";
  selector.style.cssText = "max-width:240px;height:28px;padding:0 7px;background:var(--color-bg,#090A0C);color:var(--color-text,#F2F4F7);border:1px solid var(--color-border,#252A31);border-radius:4px;font:12px monospace";
  selector.addEventListener("change", () => { selectedModel = selector.value; });
  toolbar.append(label, selector);
  document.body.appendChild(toolbar);
}

function updateSelector() {
  if (!selector || !modelIds.length) return;
  const currentValue = selectedModel || selector.value;
  if (selector.dataset.models !== modelIds.join("\n")) {
    selector.replaceChildren(...modelIds.map((id) => new Option(id, id)));
    selector.dataset.models = modelIds.join("\n");
  }
  selectedModel = modelIds.includes(currentValue) ? currentValue : modelIds[0];
  selector.value = selectedModel;
  selector.disabled = false;
}

async function loadModels() {
  if (loadingModels) return;
  loadingModels = true;
  try {
    const endpoint = await findActiveEndpoint();
    if (!endpoint?.baseUrl) return;
    const endpointKey = `${endpoint.id}:${endpoint.baseUrl}:${endpoint.apiKey}`;
    if (endpointKey === activeEndpointKey && modelIds.length) return;
    const response = await originalFetch(`${endpoint.baseUrl.replace(/\/+$/, "")}/models`, {
      method: "GET",
      headers: { Authorization: `Bearer ${endpoint.apiKey}`, "Content-Type": "application/json" },
    });
    if (!response.ok) return;
    const payload = await response.json();
    const nextModels = Array.isArray(payload.data)
      ? payload.data.map((model) => String(model.id || "")).filter(Boolean)
      : [];
    if (!nextModels.length) return;
    activeEndpointKey = endpointKey;
    modelIds = nextModels;
    selectedModel = modelIds.includes(endpoint.defaultModel) ? endpoint.defaultModel : modelIds[0];
    ensureToolbar();
    updateSelector();
  } catch {
    // Keep the normal chat available when an endpoint cannot list models.
  } finally {
    loadingModels = false;
  }
}

window.fetch = (input, init = {}) => {
  const url = typeof input === "string" ? input : input?.url || "";
  if (selectedModel && /\/chat\/completions(?:\?|$)/.test(url) && init.body) {
    try {
      const body = JSON.parse(init.body);
      body.model = selectedModel;
      init = { ...init, body: JSON.stringify(body) };
    } catch {
      // Leave non-JSON requests unchanged.
    }
  }
  return originalFetch(input, init);
};

ensureToolbar();
loadModels();
window.setInterval(loadModels, 2500);
