import { renderAdminDashboard } from "./dashboard/adminDashboard.js";
import { renderModeratorDashboard } from "./dashboard/moderatorDashboard.js";
import { renderStudentDashboard } from "./dashboard/studentDashboard.js";
import "./style/default.css"

const content = document.querySelector("#content");
const nav = document.querySelector("nav");

const pages = {
  admin: renderAdminDashboard,
  moderator: renderModeratorDashboard,
  student: renderStudentDashboard,
};

nav.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const tab = btn.dataset.tab;
  pages[tab](content);
});

// default page
renderAdminDashboard(content);
