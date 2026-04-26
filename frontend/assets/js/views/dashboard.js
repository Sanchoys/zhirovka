import { apiRequest } from "../api.js";
import { escapeHtml, money, numberValue } from "../format.js";

let breakdownChart = null;
let trendChart = null;

const chartColors = [
  "#0d6efd",
  "#198754",
  "#dc3545",
  "#ffc107",
  "#6f42c1",
  "#20c997",
  "#fd7e14",
  "#0dcaf0",
];

export function initDashboardView() {
  const now = new Date();

  document.querySelector("#dashboardMonth").value = String(now.getMonth() + 1);
  document.querySelector("#dashboardYear").value = String(now.getFullYear());
  document.querySelector("#dashboardRefresh").addEventListener("click", loadDashboard);
  document.querySelector("#dashboardMonth").addEventListener("change", loadDashboard);
  document.querySelector("#dashboardYear").addEventListener("change", loadDashboard);

  loadDashboard();
}

async function loadDashboard() {
  const month = Number(document.querySelector("#dashboardMonth").value);
  const year = Number(document.querySelector("#dashboardYear").value);

  try {
    const [summary, trend] = await Promise.all([
      apiRequest(`/dashboard/summary?billing_year=${year}&billing_month=${month}`),
      apiRequest(`/dashboard/trend?billing_year=${year}&billing_month=${month}&months=12`),
    ]);

    renderMetrics(summary);
    renderCharges(summary.charges);
    renderBreakdownChart(summary.breakdown);
    renderTrendChart(trend.months);
    hideAlert();
  } catch (error) {
    showAlert(error.message, "danger");
  }
}

function renderMetrics(summary) {
  document.querySelector("#dashboardTotal").textContent = money(summary.total_cost);
  document.querySelector("#dashboardObjects").textContent = summary.objects_count;
  document.querySelector("#dashboardServices").textContent = summary.services_count;
}

function renderCharges(charges) {
  const body = document.querySelector("#dashboardChargesBody");

  if (!charges.length) {
    body.innerHTML = `<tr><td colspan="5" class="text-secondary">Начисления за выбранный месяц не найдены</td></tr>`;
    return;
  }

  body.innerHTML = charges.map((charge) => `
    <tr>
      <td>${escapeHtml(charge.object_name)}</td>
      <td>${escapeHtml(charge.service_name)}</td>
      <td>${numberValue(charge.billable_quantity)}</td>
      <td>${money(charge.applied_price)}</td>
      <td class="text-end fw-semibold">${money(charge.final_cost)}</td>
    </tr>
  `).join("");
}

function renderBreakdownChart(items) {
  const canvas = document.querySelector("#breakdownChart");
  const labels = items.map((item) => item.service_name);
  const data = items.map((item) => Number(item.total_cost));

  breakdownChart?.destroy();
  breakdownChart = new Chart(canvas, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map((_, index) => chartColors[index % chartColors.length]),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}

function renderTrendChart(items) {
  const canvas = document.querySelector("#trendChart");
  const labels = items.map((item) => `${String(item.billing_month).padStart(2, "0")}.${item.billing_year}`);
  const data = items.map((item) => Number(item.total_cost));

  trendChart?.destroy();
  trendChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "BYN",
        data,
        backgroundColor: "#0d6efd",
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}

function showAlert(message, variant) {
  const alert = document.querySelector("#dashboardAlert");
  alert.textContent = message;
  alert.className = `alert alert-${variant} mt-3 mb-0`;
}

function hideAlert() {
  const alert = document.querySelector("#dashboardAlert");
  alert.textContent = "";
  alert.className = "alert d-none mt-3 mb-0";
}
