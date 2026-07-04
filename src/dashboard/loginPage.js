import { getStationById } from "../app/stationManager.js";
import { validateUser } from "../app/users.js";
import { renderAssessmentInfo } from "./assessmentInfo.js";
import { renderMainMenu } from "./mainMenu.js";
import { renderHomePage } from "./homePage.js";
import { renderAdminDashboard } from "./adminDashboard.js";
import { showNoticeDialog, withLoadingOverlay } from "../utilities/utility.js";
import { getStudentResults } from "../app/result.js";
import { renderProcedureInfo } from "./procedureAssessmentInfo.js";
import { clearAuthToken, setAuthToken } from "../app/backendApi.js";

export function renderLoginPage(container, stationId, type) {
  const station = stationId ? getStationById(stationId) : null;
  const overlayTitle =
    type === "admin"
      ? "Admin Login"
      : type === "procedure"
        ? `Procedure ${station?.name || ""}`
        : `Question ${station?.name || ""}`;

  container.innerHTML = `

<div class="login-page">

    <button class="back-btn back-to-station-selection" data-admin-action="back-to-station-selection">
      ← Back
    </button>

    <div class="login-left">

        <div class="login-overlay">

            <h1>

            ${overlayTitle}

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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    const username = formData.get("username");
    const password = formData.get("password");

    const station = getStationById(stationId);

    await withLoadingOverlay("Signing in", async () => {
      const user = await validateUser(username, password);

      if (!user) {
        showNoticeDialog({
          title: "Warning !!!",
          message: "Invalid username or password.",
        });

        return;
      }

      if (type === "admin") {
        if (user.role !== "admin") {
          clearAuthToken();
          showNoticeDialog({
            title: "Access Denied !!!",
            message: "Only admin users can open the admin dashboard.",
          });
          return;
        }

        if (user.token) {
          setAuthToken(user.token);
        }

        renderAdminDashboard(container);
        return;
      }

      // Enforce the current UI role rules before routing into an assessment flow.
      if (user.role === "moderator" && type === "question") {
        clearAuthToken();
        showNoticeDialog({
          title: "Access Denied !!!",
          message: "You are not Authorised to View Question Station",
        });
        return;
      }

      if (user.role === "student" && type === "procedure") {
        clearAuthToken();
        showNoticeDialog({
          title: "Access Denied !!!",
          message: "You are not Authorised to View Procedure Station",
        });
        return;
      }

      if (user.role === "student") {
        if (user.token) {
          setAuthToken(user.token);
        }

        const existingResult = getStudentResults(user.id, station.id);
        renderAssessmentInfo(container, user, station, type, existingResult);
      }

      // Moderators jump directly into the examiner workflow for procedure scoring.
      if (user.role === "moderator") {
        if (user.token) {
          setAuthToken(user.token);
        }

        renderProcedureInfo(container, station, user, type);
      }
    });
  });

  const bactToMenu = container.querySelector(".back-btn");
  bactToMenu.addEventListener("click", (e) => {
    const targetBtn = e.target.closest(".back-btn");
    if (targetBtn) {
      clearAuthToken();

      if (type === "admin") {
        renderHomePage(container);
        return;
      }

      renderMainMenu(container);
    }
  });
}
