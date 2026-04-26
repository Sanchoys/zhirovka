import { apiRequest } from "../api.js";
import { calcMethodLabels, escapeHtml, money, numberValue } from "../format.js";

let objects = [];
let formData = null;
let chargeRows = [];

export function initMonthlyView() {
  const now = new Date();

  document.querySelector("#billingMonth").value = String(now.getMonth() + 1);
  document.querySelector("#billingYear").value = String(now.getFullYear());
  document.querySelector("#loadMonthlyData").addEventListener("click", loadFormData);
  document.querySelector("#objectSelect").addEventListener("change", loadFormData);
  document.querySelector("#billingMonth").addEventListener("change", loadFormData);
  document.querySelector("#billingYear").addEventListener("change", loadFormData);
  document.querySelector("#monthlyForm").addEventListener("submit", saveMonthlyRecord);

  loadObjects();
}

async function loadObjects() {
  try {
    objects = await apiRequest("/objects");
    renderObjectOptions();
  } catch (error) {
    showAlert(error.message, "danger");
  }
}

function renderObjectOptions() {
  const select = document.querySelector("#objectSelect");
  const activeObjects = objects.filter((item) => item.is_active);

  select.innerHTML = [
    `<option value="">Выберите объект</option>`,
    ...activeObjects.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`),
  ].join("");

  if (activeObjects.length === 1) {
    select.value = String(activeObjects[0].id);
    loadFormData();
  }
}

async function loadFormData() {
  const objectId = document.querySelector("#objectSelect").value;
  const month = Number(document.querySelector("#billingMonth").value);
  const year = Number(document.querySelector("#billingYear").value);

  if (!objectId || !month || !year) {
    return;
  }

  try {
    formData = await apiRequest(
      `/monthly-records/form-data?object_id=${objectId}&billing_year=${year}&billing_month=${month}`,
    );
    chargeRows = formData.charges.map((charge) => ({
      ...charge,
      previous_reading: charge.previous_reading ?? "",
      current_reading: "",
      consumption: 0,
      billable_quantity: getInitialBillableQuantity(charge),
      final_cost: 0,
    }));
    renderMonthlyMeta();
    renderCharges();
    recalculateAll();
    hideAlert();
  } catch (error) {
    showAlert(error.message, "danger");
  }
}

function renderMonthlyMeta() {
  const meta = document.querySelector("#monthlyObjectMeta");
  const status = formData.existing_record_id
    ? "Запись за этот период уже существует и будет перезаписана"
    : "Будет создана новая запись";

  meta.textContent = `${formData.object_name}: ${numberValue(formData.area_m2)} м², жильцов: ${formData.residents_count}. ${status}.`;
}

function renderCharges() {
  const body = document.querySelector("#monthlyChargesBody");

  if (!chargeRows.length) {
    body.innerHTML = `<tr><td colspan="6" class="text-secondary">Нет активных услуг с тарифами для выбранного периода</td></tr>`;
    return;
  }

  body.innerHTML = chargeRows.map((charge, index) => `
    <tr data-charge-index="${index}">
      <td>
        <div class="fw-semibold">${escapeHtml(charge.service_name)}</div>
        <div class="small text-secondary">${escapeHtml(calcMethodLabels[charge.calc_method])}</div>
      </td>
      <td>
        <div>${money(charge.price)}</div>
        <div class="small text-secondary">с ${charge.valid_from}</div>
      </td>
      <td>
        <input
          class="form-control form-control-sm"
          type="number"
          min="0"
          step="0.0001"
          data-field="previous_reading"
          data-index="${index}"
          value="${charge.previous_reading}"
          ${charge.has_meter ? "" : "disabled"}
        >
      </td>
      <td>
        <input
          class="form-control form-control-sm"
          type="number"
          min="0"
          step="0.0001"
          data-field="current_reading"
          data-index="${index}"
          value="${charge.current_reading}"
          ${charge.has_meter ? "" : "disabled"}
        >
      </td>
      <td>
        <div class="fw-semibold" data-consumption="${index}">0</div>
        <div class="small text-secondary">${escapeHtml(charge.service_unit || "")}</div>
      </td>
      <td class="fw-semibold" data-cost="${index}">0.00</td>
    </tr>
  `).join("");

  body.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("input", handleReadingInput);
  });
}

function handleReadingInput(event) {
  const index = Number(event.target.dataset.index);
  const field = event.target.dataset.field;

  chargeRows[index][field] = event.target.value;
  recalculateRow(index);
  updateTotal();
}

function recalculateAll() {
  chargeRows.forEach((_, index) => recalculateRow(index));
  updateTotal();
}

function recalculateRow(index) {
  const charge = chargeRows[index];
  const price = Number(charge.price);
  const previous = Number(charge.previous_reading || 0);
  const current = Number(charge.current_reading || 0);

  if (charge.has_meter && charge.current_reading !== "") {
    charge.consumption = Math.max(current - previous, 0);
  } else if (charge.calc_method === "per_area") {
    charge.consumption = Number(formData.area_m2);
  } else if (charge.calc_method === "per_person") {
    charge.consumption = Number(formData.residents_count);
  } else if (charge.calc_method === "fixed") {
    charge.consumption = 1;
  } else {
    charge.consumption = 0;
  }

  charge.billable_quantity = getBillableQuantity(charge);
  charge.final_cost = roundMoney(charge.billable_quantity * price);

  document.querySelector(`[data-consumption="${index}"]`).textContent = numberValue(charge.billable_quantity);
  document.querySelector(`[data-cost="${index}"]`).textContent = money(charge.final_cost);
}

function getInitialBillableQuantity(charge) {
  if (charge.calc_method === "per_area") {
    return Number(formData?.area_m2 || 0);
  }
  if (charge.calc_method === "per_person") {
    return Number(formData?.residents_count || 0);
  }
  if (charge.calc_method === "fixed") {
    return 1;
  }
  return 0;
}

function getBillableQuantity(charge) {
  if (charge.calc_method === "per_area") {
    return Number(formData.area_m2);
  }
  if (charge.calc_method === "per_person") {
    return Number(formData.residents_count);
  }
  if (charge.calc_method === "fixed") {
    return 1;
  }
  return Number(charge.consumption || 0);
}

function updateTotal() {
  const total = chargeRows.reduce((sum, charge) => sum + Number(charge.final_cost || 0), 0);
  document.querySelector("#monthlyTotal").textContent = `${money(total)} BYN`;
}

async function saveMonthlyRecord(event) {
  event.preventDefault();

  if (!formData) {
    showAlert("Сначала загрузите данные месяца", "warning");
    return;
  }

  const invalidMeter = chargeRows.find((charge) => {
    if (!charge.has_meter || charge.current_reading === "") {
      return false;
    }
    return Number(charge.current_reading) < Number(charge.previous_reading || 0);
  });

  if (invalidMeter) {
    showAlert(`Текущие показания меньше предыдущих: ${invalidMeter.service_name}`, "danger");
    return;
  }

  const payload = {
    object_id: formData.object_id,
    billing_year: formData.billing_year,
    billing_month: formData.billing_month,
    notes: document.querySelector("#monthlyNotes").value.trim() || null,
    charges: chargeRows.map((charge) => ({
      service_id: charge.service_id,
      tariff_id: charge.tariff_id,
      previous_reading: charge.has_meter && charge.previous_reading !== "" ? charge.previous_reading : null,
      current_reading: charge.has_meter && charge.current_reading !== "" ? charge.current_reading : null,
      consumption: String(charge.consumption),
      billable_quantity: String(charge.billable_quantity),
      applied_price: String(charge.price),
      final_cost: String(charge.final_cost),
      notes: null,
    })),
  };

  try {
    const saved = await apiRequest("/monthly-records", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    formData.existing_record_id = saved.id;
    renderMonthlyMeta();
    showAlert(`Месяц сохранён. Итого: ${money(saved.total_cost)} BYN`, "success");
  } catch (error) {
    showAlert(error.message, "danger");
  }
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function showAlert(message, variant) {
  const alert = document.querySelector("#monthlyAlert");
  alert.textContent = message;
  alert.className = `alert alert-${variant} mt-3 mb-0`;
}

function hideAlert() {
  const alert = document.querySelector("#monthlyAlert");
  alert.textContent = "";
  alert.className = "alert d-none mt-3 mb-0";
}
