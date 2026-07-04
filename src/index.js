import {
  retrieveResults,
  retrieveStations,
  retrieveUsers,
} from "./app/localStorage.js";
import { renderHomePage } from "./dashboard/homePage.js";
import { hideLoadingOverlay, showLoadingOverlay } from "./utilities/utility.js";
import "./style/default.css";

const content = document.querySelector("#content");

document.addEventListener("DOMContentLoaded", async () => {
  showLoadingOverlay();

  try {
    await retrieveStations();
    await retrieveUsers();
    await retrieveResults();

    renderHomePage(content);
  } finally {
    hideLoadingOverlay();
  }
});
