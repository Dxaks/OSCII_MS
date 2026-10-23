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
import { showAdminReturnDialog } from "./adminReturnDialog.js";
import { clearSession, saveBrowserSession } from "../session/session.js";

const PROTECTED_LOGIN_STATE = "protected-login";

let protectedLoginContext = null;
let protectedLoginPopStateBound = false;
let restoringProtectedLogin = false;

function isProtectedLogin(type) {
  return type === "procedure" || type === "question";
}

function bindProtectedLoginPopState() {
  if (protectedLoginPopStateBound) {
    return;
  }

  // The browser back button should never escape a protected login flow without
  // first passing through admin verification, so we keep one global popstate
  // trap for the lifetime of the app.
  window.addEventListener("popstate", handleProtectedLoginPopState);
  protectedLoginPopStateBound = true;
}

function leaveProtectedLoginFlow() {
  protectedLoginContext = null;
  restoringProtectedLogin = false;
}

function syncProtectedLoginHistory(container, stationId, type) {
  if (!isProtectedLogin(type)) {
    leaveProtectedLoginFlow();
    return;
  }

  protectedLoginContext = {container, stationId, type};

  const protectedState = {
    view: PROTECTED_LOGIN_STATE,
    stationId: stationId,
    type: type,
  };

  const currentState = window.history.state;
  // Keep the current entry marked as protected login so a refresh or browser
  // back action can be restored to the same guarded screen.
  if (
    currentState?.view !== protectedState.view ||
    currentState?.stationId !== stationId ||
    currentState?.type !== type
  ) {
    window.history.pushState(protectedState, "", window.location.href);
  } else {
    window.history.replaceState(protectedState, "", window.location.href);
  }

  bindProtectedLoginPopState();
}

function handleProtectedLoginPopState() {
  if (!protectedLoginContext) {
    return;
  }

  if (restoringProtectedLogin) {
    restoringProtectedLogin = false;
    return;
  }

  const {container} = protectedLoginContext;

  // The browser has already moved one step back, so immediately move it
  // forward again and keep the protected login visible until an admin approves.
  restoringProtectedLogin = true;
  window.history.forward();

  showAdminReturnDialog(() => {
    clearSession("session");
    clearAuthToken();
    leaveProtectedLoginFlow();
    window.history.replaceState({view: "main-menu"}, "", window.location.href);
    renderMainMenu(container);
  });
}

export function renderLoginPage(container, stationId, type) {

  const station = stationId ? getStationById(stationId) : null;
  const overlayTitle =
    type === "admin"
      ? "Admin Login"
      : type === "procedure"
        ? `${station?.procedureName || ""}`
        : `${station?.questionName || ""}`;

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

                ${type === "question" ? `
                  <input
                    type="text"
                    name="username"
                    placeholder="Admission Number"
                    autocomplete="username"
                    required
                  >
                ` : `
                  <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    autocomplete="username"
                    required
                  >

                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    autocomplete="current-password"
                    required
                  >
                `}

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


  if (isProtectedLogin(type)) {
    saveBrowserSession({stationId: stationId, type: type});
  }

  syncProtectedLoginHistory(container, stationId, type);

  setupLoginEvents(container, stationId, type);

}


function setupLoginEvents(container, stationId, type) {
  const form = container.querySelector(".login-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    // const username = formData.get("username");
    // const password = formData.get("password");

    const username = formData.get("username")?.trim();
    const password = type === "question" ? username : formData.get("password");

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

        clearSession("session");
        leaveProtectedLoginFlow();
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

        clearSession("session");
        leaveProtectedLoginFlow();
        const existingResult = getStudentResults(user.id, station.id);
        renderAssessmentInfo(container, user, station, type, existingResult);
      }

      // Moderators jump directly into the examiner workflow for procedure scoring.
      if (user.role === "moderator") {
        if (user.token) {
          setAuthToken(user.token);
        }

        clearSession("session");
        leaveProtectedLoginFlow();
        renderProcedureInfo(container, station, user, type);
      }
    });
  });

  const backToMenu = container.querySelector(".back-btn");
  backToMenu.addEventListener("click", (e) => {
    const targetBtn = e.target.closest(".back-btn");
    if (targetBtn) {
      clearAuthToken();

      if (type === "admin") {
        clearSession("session");
        renderHomePage(container);
        return;
      }

      if (type === "procedure" || type === "question") {
        showAdminReturnDialog(() => {
          clearSession("session");
          renderMainMenu(container);
        });
        return;
      }

      clearSession("session");
      renderMainMenu(container);
    }

  });
}
