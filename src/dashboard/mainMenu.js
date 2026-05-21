import { getAllStations } from "../app/stationManager.js";
import { renderAdminDashboard } from "./adminDashboard.js";

export function renderMainMenu(container) {

    container.innerHTML = "";

    const backBtn = document.createElement("button");
      backBtn.className = "back-btn";
      backBtn.textContent = "← Back";
    
      backBtn.addEventListener("click", () => {
        renderAdminDashboard(container);
      });
    
    container.appendChild(backBtn);

    const section = document.createElement("section");
    section.className = "main-menu-page";

    section.innerHTML = `
        <h1>

        Main Menu

        </h1>

        <div
        class="main-menu-buttons"
        >

        </div>
    `;

    container.appendChild(section);

    const buttonContainer = section.querySelector(".main-menu-buttons");

    const stations = Object.values(getAllStations());

    stations.forEach((station) => {

    const procedureBtn = document.createElement("button");

    procedureBtn.className = "menu-btn procedure-btn";

    procedureBtn.textContent = `Procedure ${station.name}`;

    procedureBtn.dataset.type = "procedure";

    procedureBtn.dataset.stationId = station.id;


    const questionBtn = document.createElement("button");

    questionBtn.className = "menu-btn question-btn";

    questionBtn.textContent = `Questions ${station.name}`;

    questionBtn.dataset.type = "question";

    questionBtn.dataset.stationId = station.id;


    buttonContainer.append(procedureBtn); 
    buttonContainer.append(questionBtn);

    });
}