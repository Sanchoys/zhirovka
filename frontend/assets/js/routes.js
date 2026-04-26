import { initDashboardView } from "./views/dashboard.js";
import { initObjectsView } from "./views/objects.js";
import { initMonthlyView } from "./views/monthly.js";
import { initTariffsView } from "./views/tariffs.js";

const dashboardView = () => `
  <section class="card mb-3">
    <div class="card-body">
      <div class="row g-3 align-items-end">
        <div class="col-6 col-md-3">
          <label class="form-label" for="dashboardMonth">Месяц</label>
          <select class="form-select" id="dashboardMonth">
            <option value="1">Январь</option>
            <option value="2">Февраль</option>
            <option value="3">Март</option>
            <option value="4">Апрель</option>
            <option value="5">Май</option>
            <option value="6">Июнь</option>
            <option value="7">Июль</option>
            <option value="8">Август</option>
            <option value="9">Сентябрь</option>
            <option value="10">Октябрь</option>
            <option value="11">Ноябрь</option>
            <option value="12">Декабрь</option>
          </select>
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label" for="dashboardYear">Год</label>
          <input class="form-control" id="dashboardYear" type="number" min="2000" max="2200">
        </div>
        <div class="col-12 col-md-3">
          <button class="btn btn-outline-primary w-100" id="dashboardRefresh" type="button">
            <i class="bi bi-arrow-clockwise"></i>
            Обновить
          </button>
        </div>
      </div>
      <div class="alert d-none mt-3 mb-0" id="dashboardAlert" role="alert"></div>
    </div>
  </section>

  <section class="row g-3 mb-3">
    <div class="col-12 col-md-4">
      <div class="card metric">
        <div class="card-body">
          <div class="text-secondary small mb-2">Текущий месяц</div>
          <div class="h3 mb-1" id="dashboardTotal">0.00</div>
          <div class="text-secondary">BYN начислено</div>
        </div>
      </div>
    </div>
    <div class="col-12 col-md-4">
      <div class="card metric">
        <div class="card-body">
          <div class="text-secondary small mb-2">Заполненные объекты</div>
          <div class="h3 mb-1" id="dashboardObjects">0</div>
          <div class="text-secondary">за выбранный месяц</div>
        </div>
      </div>
    </div>
    <div class="col-12 col-md-4">
      <div class="card metric">
        <div class="card-body">
          <div class="text-secondary small mb-2">Услуги</div>
          <div class="h3 mb-1" id="dashboardServices">0</div>
          <div class="text-secondary">с начислениями</div>
        </div>
      </div>
    </div>
  </section>

  <section class="row g-3 mb-3">
    <div class="col-12 col-xl-5">
      <div class="card chart-card">
        <div class="card-header bg-white">
          <h2 class="h6 mb-0">Разбивка по услугам</h2>
        </div>
        <div class="card-body">
          <canvas id="breakdownChart"></canvas>
        </div>
      </div>
    </div>
    <div class="col-12 col-xl-7">
      <div class="card chart-card">
        <div class="card-header bg-white">
          <h2 class="h6 mb-0">Расходы за 12 месяцев</h2>
        </div>
        <div class="card-body">
          <canvas id="trendChart"></canvas>
        </div>
      </div>
    </div>
  </section>

  <section class="card">
    <div class="card-header bg-white">
      <h2 class="h6 mb-0">Начисления за месяц</h2>
    </div>
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>Объект</th>
            <th>Услуга</th>
            <th>Кол-во</th>
            <th>Цена</th>
            <th class="text-end">Сумма</th>
          </tr>
        </thead>
        <tbody id="dashboardChargesBody"></tbody>
      </table>
    </div>
  </section>
`;

const objectsView = () => `
  <section class="row g-3">
    <div class="col-12 col-xl-4">
      <form class="card" id="objectForm">
        <div class="card-header bg-white">
          <h2 class="h6 mb-0" id="objectFormTitle">Новый объект</h2>
        </div>
        <div class="card-body">
          <input type="hidden" id="objectId">
          <div class="mb-3">
            <label class="form-label" for="objectName">Название</label>
            <input class="form-control" id="objectName" name="name" maxlength="120" required>
          </div>
          <div class="mb-3">
            <label class="form-label" for="objectType">Тип</label>
            <select class="form-select" id="objectType" name="object_type" required>
              <option value="Квартира">Квартира</option>
              <option value="Загородный дом">Загородный дом</option>
              <option value="Дача">Дача</option>
              <option value="Гараж">Гараж</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label" for="objectAddress">Адрес</label>
            <textarea class="form-control" id="objectAddress" name="address" rows="2"></textarea>
          </div>
          <div class="row g-3">
            <div class="col-6">
              <label class="form-label" for="objectArea">Площадь, м²</label>
              <input class="form-control" id="objectArea" name="area_m2" type="number" min="0" step="0.01" required>
            </div>
            <div class="col-6">
              <label class="form-label" for="objectResidents">Жильцы</label>
              <input class="form-control" id="objectResidents" name="residents_count" type="number" min="0" step="1" value="0" required>
            </div>
          </div>
          <div class="form-check form-switch mt-3">
            <input class="form-check-input" id="objectActive" name="is_active" type="checkbox" checked>
            <label class="form-check-label" for="objectActive">Активен</label>
          </div>
          <div class="alert d-none mt-3 mb-0" id="objectAlert" role="alert"></div>
        </div>
        <div class="card-footer bg-white d-flex gap-2">
          <button class="btn btn-primary" type="submit">
            <i class="bi bi-check-lg"></i>
            Сохранить
          </button>
          <button class="btn btn-outline-secondary" id="objectReset" type="button">Сбросить</button>
        </div>
      </form>
    </div>

    <div class="col-12 col-xl-8">
      <section class="card">
        <div class="card-header bg-white">
          <h2 class="h6 mb-0">Объекты недвижимости</h2>
        </div>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Название</th>
                <th>Тип</th>
                <th>Площадь</th>
                <th>Жильцы</th>
                <th>Статус</th>
                <th class="text-end">Действия</th>
              </tr>
            </thead>
            <tbody id="objectsTableBody"></tbody>
          </table>
        </div>
      </section>
    </div>
  </section>
`;

const tariffsView = () => `
  <section class="row g-3">
    <div class="col-12 col-xl-4">
      <form class="card mb-3" id="serviceForm">
        <div class="card-header bg-white">
          <h2 class="h6 mb-0">Новая услуга</h2>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label" for="serviceName">Название</label>
            <input class="form-control" id="serviceName" maxlength="120" required>
          </div>
          <div class="mb-3">
            <label class="form-label" for="serviceUnit">Единица</label>
            <input class="form-control" id="serviceUnit" maxlength="40" placeholder="м³, кВт⋅ч, м²">
          </div>
          <div class="form-check form-switch">
            <input class="form-check-input" id="serviceHasMeter" type="checkbox">
            <label class="form-check-label" for="serviceHasMeter">Счётчик</label>
          </div>
          <div class="form-check form-switch mt-2">
            <input class="form-check-input" id="serviceIncludeInTotal" type="checkbox" checked>
            <label class="form-check-label" for="serviceIncludeInTotal">Учитывать в итогах</label>
          </div>
          <div class="alert d-none mt-3 mb-0" id="serviceAlert" role="alert"></div>
        </div>
        <div class="card-footer bg-white">
          <button class="btn btn-outline-primary" type="submit">
            <i class="bi bi-plus-lg"></i>
            Добавить услугу
          </button>
        </div>
      </form>

      <form class="card" id="tariffForm">
        <div class="card-header bg-white">
          <h2 class="h6 mb-0" id="tariffFormTitle">Новый тариф</h2>
        </div>
        <div class="card-body">
          <input type="hidden" id="tariffId">
          <div class="mb-3">
            <label class="form-label" for="tariffService">Услуга</label>
            <select class="form-select" id="tariffService" required></select>
          </div>
          <div class="row g-3">
            <div class="col-6">
              <label class="form-label" for="tariffPrice">Цена</label>
              <input class="form-control" id="tariffPrice" type="number" min="0" step="0.0001" required>
            </div>
            <div class="col-6">
              <label class="form-label" for="tariffValidFrom">Действует с</label>
              <input class="form-control" id="tariffValidFrom" type="date" required>
            </div>
          </div>
          <div class="mt-3">
            <label class="form-label" for="tariffCalcMethod">Метод расчёта</label>
            <select class="form-select" id="tariffCalcMethod" required>
              <option value="per_unit">По потреблению</option>
              <option value="per_area">По площади</option>
              <option value="per_person">По жильцам</option>
              <option value="fixed">Фиксировано</option>
              <option value="manual">Вручную по счёту</option>
            </select>
          </div>
          <div class="alert d-none mt-3 mb-0" id="tariffAlert" role="alert"></div>
        </div>
        <div class="card-footer bg-white d-flex gap-2">
          <button class="btn btn-primary" type="submit">
            <i class="bi bi-check-lg"></i>
            Сохранить
          </button>
          <button class="btn btn-outline-secondary" id="tariffReset" type="button">Сбросить</button>
        </div>
      </form>
    </div>

    <div class="col-12 col-xl-8">
      <section class="card mb-3">
        <div class="card-header bg-white d-flex flex-wrap align-items-center justify-content-between gap-3">
          <h2 class="h6 mb-0">Активные тарифы</h2>
          <div class="active-date-control">
            <label class="form-label mb-0 small text-secondary" for="activeTariffDate">Дата</label>
            <input class="form-control form-control-sm" id="activeTariffDate" type="date">
          </div>
        </div>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Услуга</th>
                <th>Метод</th>
                <th>Цена</th>
                <th>Действует с</th>
              </tr>
            </thead>
            <tbody id="activeTariffsTableBody"></tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <div class="card-header bg-white">
          <h2 class="h6 mb-0">История тарифов</h2>
        </div>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Услуга</th>
                <th>Метод</th>
                <th>Цена</th>
                <th>Действует с</th>
                <th class="text-end">Действия</th>
              </tr>
            </thead>
            <tbody id="tariffsTableBody"></tbody>
          </table>
        </div>
      </section>
    </div>
  </section>
`;

const monthlyView = () => `
  <form id="monthlyForm">
    <section class="card mb-3">
      <div class="card-header bg-white">
        <h2 class="h6 mb-0">Период и объект</h2>
      </div>
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-12 col-lg-5">
            <label class="form-label" for="objectSelect">Объект</label>
            <select class="form-select" id="objectSelect" required>
              <option value="">Выберите объект</option>
            </select>
          </div>
          <div class="col-6 col-lg-3">
            <label class="form-label" for="billingMonth">Месяц</label>
            <select class="form-select" id="billingMonth">
              <option value="1">Январь</option>
              <option value="2">Февраль</option>
              <option value="3">Март</option>
              <option value="4">Апрель</option>
              <option value="5">Май</option>
              <option value="6">Июнь</option>
              <option value="7">Июль</option>
              <option value="8">Август</option>
              <option value="9">Сентябрь</option>
              <option value="10">Октябрь</option>
              <option value="11">Ноябрь</option>
              <option value="12">Декабрь</option>
            </select>
          </div>
          <div class="col-6 col-lg-2">
            <label class="form-label" for="billingYear">Год</label>
            <input class="form-control" id="billingYear" type="number" min="2000" max="2200" required>
          </div>
          <div class="col-12 col-lg-2">
            <button class="btn btn-outline-primary w-100" id="loadMonthlyData" type="button">
              <i class="bi bi-arrow-clockwise"></i>
              Загрузить
            </button>
          </div>
        </div>
        <div class="small text-secondary mt-3" id="monthlyObjectMeta"></div>
      </div>
    </section>

    <section class="card">
      <div class="card-header bg-white d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h2 class="h6 mb-0">Показания и начисления</h2>
        <div class="h5 mb-0" id="monthlyTotal">0.00 BYN</div>
      </div>
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0 monthly-table">
          <thead>
            <tr>
              <th>Услуга</th>
              <th>Тариф</th>
              <th>Предыдущие</th>
              <th>Текущие</th>
              <th>Кол-во</th>
              <th>Итог</th>
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody id="monthlyChargesBody">
            <tr>
              <td colspan="7" class="text-secondary">Выберите объект и период</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-body border-top">
        <label class="form-label" for="monthlyNotes">Комментарий</label>
        <textarea class="form-control" id="monthlyNotes" rows="2"></textarea>
        <div class="alert d-none mt-3 mb-0" id="monthlyAlert" role="alert"></div>
      </div>
      <div class="card-footer bg-white">
        <button class="btn btn-primary" type="submit">
          <i class="bi bi-check-lg"></i>
          Сохранить месяц
        </button>
      </div>
    </section>
  </form>
`;

export const routes = {
  dashboard: {
    title: "Дашборд",
    subtitle: "Обзор начислений и расходов",
    render: dashboardView,
    init: initDashboardView,
  },
  objects: {
    title: "Объекты",
    subtitle: "Недвижимость, площадь и количество жильцов",
    render: objectsView,
    init: initObjectsView,
  },
  tariffs: {
    title: "Тарифы",
    subtitle: "История ставок и методы расчёта",
    render: tariffsView,
    init: initTariffsView,
  },
  monthly: {
    title: "Данные месяца",
    subtitle: "Показания счётчиков и начисления",
    render: monthlyView,
    init: initMonthlyView,
  },
};
