(() => {
  "use strict";

  const originalFetch = window.fetch.bind(window);
  const state = { model: "", models: [] };
  let select;

  function dbRead(storeName) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("galaxy-db");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(storeName, "readonly");
        const read = transaction.objectStore(storeName).getAll();
        read.onsuccess = () => resolve(read.result || []);
        read.onerror = () => reject(read.error);
      };
    });
  }

  function createControl() {
    if (select || !document.body) return;

    const wrapper = document.createElement("label");
    wrapper.textContent = "Model ";
    wrapper.title = "Model yang digunakan untuk pesan berikutnya";
    wrapper.style.cssText = "position:fixed;top:10px;right:16px;z-index:1000;padding:6px 8px;background:#13161a;color:#8e96a3;border:1px solid #252a31;border-radius:6px;font:12px monospace";

    select = document.createElement("select");
    select.style.cssText = "margin-left:6px;max-width:240px;height:26px;background:#090a0c;color:#f2f4f7;border:1px solid #252a31;border-radius:4px;font:12px monospace";
    select.disabled = true;
    select.addEventListener("change", () => { state.model = select.value; });
    wrapper.appendChild(select);
    document.body.appendChild(wrapper);
  }

  function showModels(models, defaultModel) {
    state.models = models;
    state.model = models.includes(defaultModel) ? defaultModel : models[0] || "";
    if (!select) return;
    select.replaceChildren(...models.map((id) => new Option(id, id)));
    select.value = state.model;
    select.disabled = models.length === 0;
  }

  async function loadModels() {
    try {
      const [endpoints, preferences] = await Promise.all([
        dbRead("endpoints"),
        dbRead("preferences"),
      ]);
      const activeId = preferences.find((item) => item.key === "activeEndpointId")?.value;
      const endpoint = endpoints.find((item) => item.id === activeId) || endpoints[0];
      if (!endpoint?.baseUrl) return;

      const response = await originalFetch(`${endpoint.baseUrl.replace(/\/+$/, "")}/models`, {
        headers: { Authorization: `Bearer ${endpoint.apiKey}`, "Content-Type": "application/json" },
      });
      if (!response.ok) return;
      const payload = await response.json();
      const models = Array.isArray(payload.data)
        ? payload.data.map((item) => String(item.id || "")).filter(Boolean)
        : [];
      showModels(models, endpoint.defaultModel);
    } catch {
      // Model discovery is optional and must not block the chat application.
    }
  }

  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input?.url || "";
    if (!state.model || !/\/chat\/completions(?:\?|$)/.test(url) || !init?.body) {
      return originalFetch(input, init);
    }
    try {
      const body = JSON.parse(init.body);
      body.model = state.model;
      return originalFetch(input, { ...init, body: JSON.stringify(body) });
    } catch {
      return originalFetch(input, init);
    }
  };

  createControl();
  window.setTimeout(loadModels, 1000);
})();
