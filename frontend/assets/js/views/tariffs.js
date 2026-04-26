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
  document.querySelector("#serviceReset").addEventListener("click", resetServiceForm);
  document.querySelector("#servicesTableBody").addEventListener("click", handleServicesTableClick);
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
    renderServices();
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

  const id = document.querySelector("#serviceId").value;
  const payload = {
    name: document.querySelector("#serviceName").value.trim(),
    unit: document.querySelector("#serviceUnit").value.trim() || null,
    has_meter: document.querySelector("#serviceHasMeter").checked,
    include_in_total: document.querySelector("#serviceIncludeInTotal").checked,
    description: null,
    is_active: true,
  };

  try {
    await apiRequest(id ? `/services/${id}` : "/services", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    resetServiceForm();
    showAlert("serviceAlert", "Услуга сохранена", "success");
    await loadAll();
  } catch (error) {
    showAlert("serviceAlert", error.message, "danger");
  }
}

function renderServices() {
  const body = document.querySelector("#servicesTableBody");

  if (!services.length) {
    body.innerHTML = `<tr><td colspan="5" class="text-secondary">Услуги не добавлены</td></tr>`;
    return;
  }

  body.innerHTML = services.map((service) => `
    <tr>
      <td>
        <div class="fw-semibold">${escapeHtml(service.name)}</div>
        <div class="small text-secondary">${service.is_active ? "Активна" : "Отключена"}</div>
      </td>
      <td>${escapeHtml(service.unit || "")}</td>
      <td>${service.has_meter ? "Да" : "Нет"}</td>
      <td>${service.include_in_total ? "Да" : "Нет"}</td>
      <td class="text-end">
        <button class="btn btn-outline-primary btn-sm" type="button" title="Редактировать" data-edit-service="${service.id}">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm" type="button" title="Удалить" data-delete-service="${service.id}">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `).join("");
}

function handleServicesTableClick(event) {
  const editButton = event.target.closest("[data-edit-service]");
  const deleteButton = event.target.closest("[data-delete-service]");

  if (editButton) {
    editService(Number(editButton.dataset.editService));
    return;
  }

  if (deleteButton) {
    deleteService(Number(deleteButton.dataset.deleteService));
  }
}

function editService(id) {
  const service = services.find((item) => item.id === id);

  if (!service) {
    return;
  }

  document.querySelector("#serviceFormTitle").textContent = "Редактирование услуги";
  document.querySelector("#serviceId").value = service.id;
  document.querySelector("#serviceName").value = service.name;
  document.querySelector("#serviceUnit").value = service.unit || "";
  document.querySelector("#serviceHasMeter").checked = service.has_meter;
  document.querySelector("#serviceIncludeInTotal").checked = service.include_in_total;
}

async function deleteService(id) {
  const service = services.find((item) => item.id === id);

  if (!service || !window.confirm(`Удалить услугу «${service.name}»?`)) {
    return;
  }

  try {
    await apiRequest(`/services/${id}`, { method: "DELETE" });
    if (document.querySelector("#serviceId").value === String(id)) {
      resetServiceForm();
    }
    showAlert("serviceAlert", "Услуга удалена", "success");
    await loadAll();
  } catch (error) {
    showAlert("serviceAlert", error.message, "danger");
  }
}

function resetServiceForm() {
  document.querySelector("#serviceFormTitle").textContent = "Новая услуга";
  document.querySelector("#serviceForm").reset();
  document.querySelector("#serviceId").value = "";
  document.querySelector("#serviceIncludeInTotal").checked = true;
  hideAlert("serviceAlert");
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
