import {
  retrieveResults,
  retrieveStations,
  retrieveUsers,
} from "./app/localStorage.js";
import { renderHomePage } from "./dashboard/homePage.js";
import { hideLoadingOverlay, showLoadingOverlay } from "./utilities/utility.js";
import "./style/default.css";
import { renderLoginPage } from "./dashboard/loginPage.js";

const content = document.querySelector("#content");

document.addEventListener("DOMContentLoaded", async () => {
  showLoadingOverlay();

  try {
    await retrieveStations();
    await retrieveUsers();
    await retrieveResults();


    // Restore a protected login flow after refresh so question/procedure users
    // do not fall back to the homepage and bypass the admin gate.
    const sessionRaw = localStorage.getItem("session");

    if (sessionRaw) {
      try {
        const session = JSON.parse(sessionRaw);

        if (session?.stationId != null && session?.type) {
          renderLoginPage(content, session.stationId, session.type);
          return;
        }
      } catch {
        localStorage.removeItem("session");
      }
    }

    renderHomePage(content);

  } finally {
    hideLoadingOverlay();
  }
});




