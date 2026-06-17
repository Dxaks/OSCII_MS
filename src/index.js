import {
  retrieveResults,
  retrieveStationsFromLocalStorage,
  retrieveUsers,
} from "./app/localStorage.js";
import { renderHomePage } from "./dashboard/homePage.js";
import "./style/default.css";

const content = document.querySelector("#content");

document.addEventListener("DOMContentLoaded", () => {
  //if localStorage has data, retrieve it.
  retrieveStationsFromLocalStorage();
  retrieveUsers();
  retrieveResults();

  // load home page after that
  renderHomePage(content);
});
