import { routes } from "./routes.js";

const app = document.querySelector("#app");
const pageTitle = document.querySelector("#pageTitle");
const pageSubtitle = document.querySelector("#pageSubtitle");
const navLinks = document.querySelectorAll("[data-route]");
const mobileLinks = document.querySelectorAll("[data-mobile-link]");

function getRouteName() {
  const route = window.location.hash.replace("#/", "") || "dashboard";
  return routes[route] ? route : "dashboard";
}

function setActiveNav(routeName) {
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.route === routeName);
  });
}

function closeMobileNav() {
  const nav = document.querySelector("#mobileNav");
  const instance = bootstrap.Offcanvas.getInstance(nav);

  if (instance) {
    instance.hide();
  }
}

function renderRoute() {
  const routeName = getRouteName();
  const route = routes[routeName];

  pageTitle.textContent = route.title;
  pageSubtitle.textContent = route.subtitle;
  app.innerHTML = route.render();
  setActiveNav(routeName);
  route.init?.();
  app.focus({ preventScroll: true });
}

mobileLinks.forEach((link) => {
  link.addEventListener("click", closeMobileNav);
});

window.addEventListener("hashchange", renderRoute);

if (!window.location.hash) {
  window.location.hash = "#/dashboard";
} else {
  renderRoute();
}
