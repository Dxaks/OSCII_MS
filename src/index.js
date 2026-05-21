import { renderHomePage } from "./dashboard/homePage.js";
import "./style/default.css"


const content = document.querySelector("#content");

document.addEventListener('DOMContentLoaded', () => {
  renderHomePage(content);
})


