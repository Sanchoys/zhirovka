import { apiRequest } from "../api.js";
import { calcMethodLabels, escapeHtml, money } from "../format.js";

let services = [];
let tariffs = [];
let activeTariffs = [];

export function initTariffsView() {
  const today = new Date().toISOString().slice(0, 10);

  document.querySelector("#activeTariffDate").value = today;
  document.querySelector("#tariffValidFrom").value = today;
  document.querySelector("#serviceForm").addEventListener("submit", handleServiceSubmit);
  document.querySelector("#tariffForm").addEventListener("submit", handleTariffSubmit);
  document.querySelector("#tariffReset").addEventListener("click", resetTariffForm);
  document.querySelector("#activeTariffDate").addEventListener("change", loadActiveTariffs);

  loadAll();
}

async function loadAll() {
  try {
    const [servicesData, tariffsData] = await Promise.all([
      apiRequest("/services"),
      apiRequest("/tariffs"),
    ]);

    services = servicesData;
    tariffs = tariffsData;
    renderServiceOptions();
    renderTariffs();
    await loadActiveTariffs();
  } catch (error) {
    showAlert("tariffAlert", error.message, "danger");
  }
}

async function loadActiveTariffs() {
  try {
    const date = document.querySelector("#activeTariffDate").value;
    activeTariffs = await apiRequest(`/tariffs/active?on_date=${encodeURIComponent(date)}`);
    renderActiveTariffs();
  } catch (error) {
    showAlert("tariffAlert", error.message, "danger");
  }
}

async function handleServiceSubmit(event) {
  event.preventDefault();

  const payload = {
    name: document.querySelector("#serviceName").value.trim(),
    unit: document.querySelector("#serviceUnit").value.trim() || null,
    has_meter: document.querySelector("#serviceHasMeter").checked,
    include_in_total: document.querySelector("#serviceIncludeInTotal").checked,
    description: null,
    is_active: true,
  };

  try {
    await apiRequest("/services", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    document.querySelector("#serviceForm").reset();
    document.querySelector("#serviceIncludeInTotal").checked = true;
    showAlert("serviceAlert", "Услуга добавлена", "success");
    await loadAll();
  } catch (error) {
    showAlert("serviceAlert", error.message, "danger");
  }
}

async function handleTariffSubmit(event) {
  event.preventDefault();

  const id = document.querySelector("#tariffId").value;
  const payload = {
    service_id: Number(document.querySelector("#tariffService").value),
    price: document.querySelector("#tariffPrice").value,
    calc_method: document.querySelector("#tariffCalcMethod").value,
    valid_from: document.querySelector("#tariffValidFrom").value,
  };

  try {
    await apiRequest(id ? `/tariffs/${id}` : "/tariffs", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    resetTariffForm();
    showAlert("tariffAlert", "Тариф сохранён", "success");
    await loadAll();
  } catch (error) {
    showAlert("tariffAlert", error.message, "danger");
  }
}

function renderServiceOptions() {
  const select = document.querySelector("#tariffService");

  if (!services.length) {
    select.innerHTML = `<option value="">Нет услуг</option>`;
    return;
  }

  select.innerHTML = services
    .filter((service) => service.is_active)
    .map((service) => `<option value="${service.id}">${escapeHtml(service.name)}</option>`)
    .join("");
}

function renderActiveTariffs() {
  const body = document.querySelector("#activeTariffsTableBody");

  if (!activeTariffs.length) {
    body.innerHTML = `<tr><td colspan="4" class="text-secondary">Активные тарифы не найдены</td></tr>`;
    return;
  }

  body.innerHTML = activeTariffs.map((item) => `
    <tr>
      <td>${escapeHtml(item.service_name)}</td>
      <td>${calcMethodLabels[item.calc_method]}</td>
      <td>${money(item.price)} ${escapeHtml(item.service_unit || "")}</td>
      <td>${item.valid_from}</td>
    </tr>
  `).join("");
}

function renderTariffs() {
  const body = document.querySelector("#tariffsTableBody");

  if (!tariffs.length) {
    body.innerHTML = `<tr><td colspan="5" class="text-secondary">Тарифы не добавлены</td></tr>`;
    return;
  }

  body.innerHTML = tariffs.map((item) => `
    <tr>
      <td>${escapeHtml(item.service_name)}</td>
      <td>${calcMethodLabels[item.calc_method]}</td>
      <td>${money(item.price)} ${escapeHtml(item.service_unit || "")}</td>
      <td>${item.valid_from}</td>
      <td class="text-end">
        <button class="btn btn-outline-primary btn-sm" type="button" data-edit-tariff="${item.id}">
          <i class="bi bi-pencil"></i>
        </button>
      </td>
    </tr>
  `).join("");

  body.querySelectorAll("[data-edit-tariff]").forEach((button) => {
    button.addEventListener("click", () => editTariff(Number(button.dataset.editTariff)));
  });
}

function editTariff(id) {
  const item = tariffs.find((tariff) => tariff.id === id);

  if (!item) {
    return;
  }

  document.querySelector("#tariffFormTitle").textContent = "Редактирование тарифа";
  document.querySelector("#tariffId").value = item.id;
  document.querySelector("#tariffService").value = item.service_id;
  document.querySelector("#tariffPrice").value = item.price;
  document.querySelector("#tariffCalcMethod").value = item.calc_method;
  document.querySelector("#tariffValidFrom").value = item.valid_from;
}

function resetTariffForm() {
  const today = new Date().toISOString().slice(0, 10);

  document.querySelector("#tariffFormTitle").textContent = "Новый тариф";
  document.querySelector("#tariffForm").reset();
  document.querySelector("#tariffId").value = "";
  document.querySelector("#tariffValidFrom").value = today;
  hideAlert("tariffAlert");
}

function showAlert(id, message, variant) {
  const alert = document.querySelector(`#${id}`);
  alert.textContent = message;
  alert.className = `alert alert-${variant} mt-3 mb-0`;
}

function hideAlert(id) {
  const alert = document.querySelector(`#${id}`);
  alert.className = "alert d-none mt-3 mb-0";
  alert.textContent = "";
}
