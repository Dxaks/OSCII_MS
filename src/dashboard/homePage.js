import { renderMainMenu } from "./mainMenu.js";
import { renderLoginPage } from "./loginPage.js";

export function renderHomePage(container) {
  container.innerHTML = `

<div class="home-page">

    <div class="home-logo"></div>

    <div class="home-content">

        <h1>

            Welcome to UMCONS
            <span>
            Clinical Assessment Test
            </span>

        </h1>

        <p>

            Objective Structured Clinical
            Assessment System

        </p>

        <div class="home-actions">

            <button
            class="home-page-btn"
            data-tab="admin-tab">

                Admin Dashboard

            </button>

            <button
            class="home-page-btn secondary-btn"
            data-tab="menu-tab">

                Main Menu

            </button>

        </div>

    </div>

</div>

`;

  sethomePageRoute(container);
}

function sethomePageRoute(container) {
  const body = document.querySelector("body");

  body.addEventListener("click", (e) => {
    const target = e.target.closest("[data-tab]");

    if (!target) return;

    if (target.dataset.tab === "admin-tab") {
      renderLoginPage(container, null, "admin");
    }

    if (target.dataset.tab === "menu-tab") {
      renderMainMenu(container);
    }
  });
}
