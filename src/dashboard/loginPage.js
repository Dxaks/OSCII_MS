import { getStationById } from "../app/stationManager.js";
import { validateUser } from "../app/users.js";
import { renderAssessmentInfo } from "./assessmentInfo.js";
import { renderMainMenu } from "./mainMenu.js";
import { showNoticeDialog } from "../utilities/utility.js";
import { getStudentResults } from "../app/result.js";
import { renderProcedureInfo } from "./procedureAssessmentInfo.js";

export function renderLoginPage(container, stationId, type) {
  const station = getStationById(stationId);

  container.innerHTML = `

<div class="login-page">

    <button class="back-btn back-to-station-selection" data-admin-action="back-to-station-selection">
      ← Back
    </button>

    <div class="login-left">

        <div class="login-overlay">

            <h1>

            ${
              type === "procedure"
                ? `Procedure ${station.name}`
                : `Question ${station.name}`
            }

            </h1>

            <p>

            UMCONS Clinical Assessment System

            </p>

        </div>

    </div>


    <div class="login-right">

        <div class="login-card">

            <h2>

                Login

            </h2>

            <form
            class="login-form"
            >

                <input
                type="text"
                name="username"
                placeholder="Username"
                required
                >

                <input
                type="password"
                name="password"
                placeholder="Password"
                required
                >

                <button
                type="submit"
                >

                Login

                </button>

            </form>

        </div>

    </div>

</div>

`;

  setupLoginEvents(container, stationId, type);
}

function setupLoginEvents(container, stationId, type) {
  const form = document.querySelector(".login-form");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    const username = formData.get("username");
    const password = formData.get("password");

    const station = getStationById(stationId);

    const user = validateUser(username, password);

    if (!user) {
      showNoticeDialog({
        title: "Warning !!!",
        message: "Invalid username or password.",
      });

      return;
    }

    // Enforce the current UI role rules before routing into an assessment flow.
    if (user.role === "moderator" && type === "question") {
      showNoticeDialog({
        title: "Access Denied !!!",
        message: "You are not Authorised to View Question Station",
      });
      return;
    }

    if (user.role === "student" && type === "procedure") {
      showNoticeDialog({
        title: "Access Denied !!!",
        message: "You are not Authorised to View Procedure Station",
      });
      return;
    }

    if (user.role === "student") {
      const existingResult = getStudentResults(user.id, station.id);
      renderAssessmentInfo(container, user, station, type, existingResult);
    }

    // Moderators jump directly into the examiner workflow for procedure scoring.
    if (user.role === "moderator") {
      renderProcedureInfo(container, station, user, type);
    }
  });

  const bactToMenu = container.querySelector(".back-btn");
  bactToMenu.addEventListener("click", (e) => {
    const targetBtn = e.target.closest(".back-btn");
    if (targetBtn) {
      renderMainMenu(container);
    }
  });
}
