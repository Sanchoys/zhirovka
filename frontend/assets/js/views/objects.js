import { apiRequest } from "../api.js";
import { escapeHtml, numberValue } from "../format.js";

let objects = [];

export function initObjectsView() {
  const form = document.querySelector("#objectForm");
  const resetButton = document.querySelector("#objectReset");
  const tableBody = document.querySelector("#objectsTableBody");

  form.addEventListener("submit", handleSubmit);
  resetButton.addEventListener("click", resetForm);
  tableBody.addEventListener("click", handleObjectTableClick);
  loadObjects();
}

async function loadObjects() {
  try {
    objects = await apiRequest("/objects");
    renderObjects();
  } catch (error) {
    showAlert("objectAlert", error.message, "danger");
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  const id = document.querySelector("#objectId").value;
  const payload = {
    name: document.querySelector("#objectName").value.trim(),
    object_type: document.querySelector("#objectType").value.trim(),
    address: document.querySelector("#objectAddress").value.trim() || null,
    area_m2: document.querySelector("#objectArea").value,
    residents_count: Number(document.querySelector("#objectResidents").value),
    is_active: document.querySelector("#objectActive").checked,
  };

  try {
    await apiRequest(id ? `/objects/${id}` : "/objects", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    resetForm();
    await loadObjects();
    showAlert("objectAlert", "Объект сохранён", "success");
  } catch (error) {
    showAlert("objectAlert", error.message, "danger");
  }
}

function renderObjects() {
  const body = document.querySelector("#objectsTableBody");

  if (!objects.length) {
    body.innerHTML = `<tr><td colspan="6" class="text-secondary">Объекты не добавлены</td></tr>`;
    return;
  }

  body.innerHTML = objects.map((item) => `
    <tr>
      <td>
        <div class="fw-semibold">${escapeHtml(item.name)}</div>
        <div class="small text-secondary">${escapeHtml(item.address || "")}</div>
      </td>
      <td>${escapeHtml(item.object_type)}</td>
      <td>${numberValue(item.area_m2)}</td>
      <td>${item.residents_count}</td>
      <td>
        <span class="badge text-bg-${item.is_active ? "success" : "secondary"}">
          ${item.is_active ? "Активен" : "Отключён"}
        </span>
      </td>
      <td class="text-end">
        <button class="btn btn-outline-primary btn-sm" type="button" title="Редактировать" data-edit-object="${item.id}">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm" type="button" title="Удалить" data-delete-object="${item.id}">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `).join("");
}

function handleObjectTableClick(event) {
  const editButton = event.target.closest("[data-edit-object]");
  const deleteButton = event.target.closest("[data-delete-object]");

  if (editButton) {
    editObject(Number(editButton.dataset.editObject));
    return;
  }

  if (deleteButton) {
    deleteObject(Number(deleteButton.dataset.deleteObject));
  }
}

function editObject(id) {
  const item = objects.find((objectItem) => objectItem.id === id);

  if (!item) {
    return;
  }

  document.querySelector("#objectFormTitle").textContent = "Редактирование объекта";
  document.querySelector("#objectId").value = item.id;
  document.querySelector("#objectName").value = item.name;
  document.querySelector("#objectType").value = item.object_type;
  document.querySelector("#objectAddress").value = item.address || "";
  document.querySelector("#objectArea").value = item.area_m2;
  document.querySelector("#objectResidents").value = item.residents_count;
  document.querySelector("#objectActive").checked = item.is_active;
}

function resetForm() {
  document.querySelector("#objectFormTitle").textContent = "Новый объект";
  document.querySelector("#objectForm").reset();
  document.querySelector("#objectId").value = "";
  document.querySelector("#objectType").value = "Квартира";
  document.querySelector("#objectResidents").value = "0";
  document.querySelector("#objectActive").checked = true;
  hideAlert("objectAlert");
}

async function deleteObject(id) {
  const item = objects.find((objectItem) => objectItem.id === id);

  if (!item || !window.confirm(`Удалить объект «${item.name}»? Все месячные записи по нему тоже будут удалены.`)) {
    return;
  }

  try {
    await apiRequest(`/objects/${id}`, { method: "DELETE" });
    if (document.querySelector("#objectId").value === String(id)) {
      resetForm();
    }
    await loadObjects();
    showAlert("objectAlert", "Объект удалён", "success");
  } catch (error) {
    showAlert("objectAlert", error.message, "danger");
  }
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
