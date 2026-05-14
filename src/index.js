import { renderAdminDashboard } from "./dashboard/adminDashboard.js";
import { renderHomePage } from "./dashboard/homePage.js";
import "./style/default.css"


homePageRoute();

const content = document.querySelector("#content");

document.addEventListener('DOMContentLoaded', () => {
  renderHomePage(content);
})


function homePageRoute() {

  const body = document.querySelector('body');

  body.addEventListener('click', (e) => {

    const target = e.target.closest('[data-tab]');

    if(!target) return;
    
    if (target.dataset.tab === 'admin-tab') {
      renderAdminDashboard(content);
    }
  })
}