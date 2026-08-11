const DB_NAME = "galaxy-db";
const ENDPOINT_STORE = "endpoints";
const PREFERENCE_STORE = "preferences";
const originalFetch = window.fetch.bind(window);
let selectedModel = "";
let modelIds = [];
let selector;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readStore(storeName) {
  return openDatabase().then((db) => new Promise((resolve, reject) => {
    const request = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}

async function getActiveEndpoint() {
  const [endpoints, preferences] = await Promise.all([
    readStore(ENDPOINT_STORE),
    readStore(PREFERENCE_STORE),
  ]);
  const activeId = preferences.find((item) => item.key === "activeEndpointId")?.value;
  return endpoints.find((endpoint) => endpoint.id === activeId) || endpoints[0];
}

async function loadModels() {
  try {
    const endpoint = await getActiveEndpoint();
    if (!endpoint?.baseUrl) return;
    const response = await originalFetch(`${endpoint.baseUrl.replace(/\/+$/, "")}/models`, {
      headers: { Authorization: `Bearer ${endpoint.apiKey}`, "Content-Type": "application/json" },
    });
    if (!response.ok) return;
    const payload = await response.json();
    modelIds = Array.isArray(payload.data)
      ? payload.data.map((model) => String(model.id || "")).filter(Boolean)
      : [];
    selectedModel = selectedModel || endpoint.defaultModel || modelIds[0] || "";
    renderSelector();
  } catch {
    // The application still works with the configured default model.
  }
}

function renderSelector() {
  if (!modelIds.length || !document.body) return;
  const header = [...document.querySelectorAll("header, [class*=header], div")]
    .find((element) => element.textContent?.includes("/") && element.children.length <= 6);
  if (!header) return;
  if (!selector) {
    selector = document.createElement("select");
    selector.className = "input input-sm mono";
    selector.title = "Model for the next message";
    selector.style.cssText = "height:30px;max-width:260px;margin-left:8px;background:var(--color-surface);color:var(--color-text);border:1px solid var(--color-border);border-radius:6px;padding:0 8px";
    selector.addEventListener("change", () => { selectedModel = selector.value; });
  }
  selector.replaceChildren(...modelIds.map((id) => new Option(id, id)));
  selector.value = selectedModel;
  if (!selector.value && modelIds[0]) selector.value = selectedModel = modelIds[0];
  if (!selector.isConnected) header.append(selector);
}

window.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input?.url || "";
  if (selectedModel && /\/chat\/completions(?:\?|$)/.test(url) && init.body) {
    try {
      const body = JSON.parse(init.body);
      body.model = selectedModel;
      init = { ...init, body: JSON.stringify(body) };
    } catch {
      // Preserve the original request if its body is not JSON.
    }
  }
  return originalFetch(input, init);
};

new MutationObserver(renderSelector).observe(document.documentElement, { childList: true, subtree: true });
loadModels();
