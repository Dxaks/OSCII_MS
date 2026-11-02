import {
  retrieveResults,
  retrieveStations,
  retrieveUsers,
} from "./app/localStorage.js";
import { renderHomePage } from "./dashboard/homePage.js";
import { hideLoadingOverlay, showLoadingOverlay } from "./utilities/utility.js";
import "./style/default.css";
import { renderLoginPage } from "./dashboard/loginPage.js";
import { getAuthenticatedUser, clearAuthToken } from "./app/backendApi.js";
import { getUserById } from "./app/users.js";
import { getStationById } from "./app/stationManager.js";
import { createResultAndWait, getStudentResults } from "./app/result.js";
import { syncResult } from "./utilities/utility.js";
import { renderAssessmentInfo } from "./dashboard/assessmentInfo.js";
import { renderQuestionPage, renderResultPage } from "./dashboard/studentDashboard.js";
import { renderProcedureInfo } from "./dashboard/procedureAssessmentInfo.js";
import { renderProcedurePage } from "./dashboard/examinerDashboard.js";
import { getAuthToken } from "./app/backendApi.js";
import { clearSession, getBrowserSession } from "./session/session.js";

const content = document.querySelector("#content");

document.addEventListener("DOMContentLoaded", async () => {
  showLoadingOverlay();

  try {
    await retrieveStations();
    await retrieveUsers();
    await retrieveResults();


    // Restore a protected login flow after refresh so question/procedure users
    // do not fall back to the homepage and bypass the admin gate.
    const session = getBrowserSession();

    if (session?.stationId != null && session?.type) {
      if (session.phase === "protected-login" || !session.phase) {
        clearAuthToken();
        renderLoginPage(content, session.stationId, session.type);
        return;
      }

      await restoreAssessmentSession(session);
      return;
    }

    clearSession();
    renderHomePage(content);

  } finally {
    hideLoadingOverlay();
  }
});

async function restoreAssessmentSession(session) {
  const station = getStationById(session.stationId);

  if (!station || !getAuthToken()) {
    clearAuthToken();
    clearSession();
    renderHomePage(content);
    return;
  }

  try {
    const authenticatedUser = await getAuthenticatedUser();
    const expectedRole = session.type === "question" ? "student" : "moderator";

    if (
      !["question", "procedure"].includes(session.type) ||
      authenticatedUser.id !== session.userId ||
      authenticatedUser.role !== expectedRole ||
      session.role !== expectedRole
    ) {
      throw new Error("The saved assessment session no longer matches this login.");
    }

    if (session.type === "question") {
      if (session.phase === "question-info") {
        const existingResult = getStudentResults(authenticatedUser.id, station.id);
        renderAssessmentInfo(content, authenticatedUser, station, session.type, existingResult);
        return;
      }

      if (session.phase === "question-assessment") {
        const result = await createResultAndWait(authenticatedUser.id, station.id);
        if (result.id !== session.resultId) {
          throw new Error("The saved question assessment record could not be matched.");
        }
        if (result.status?.question === "in-progress") {
          if (station.questions.length === 0) {
            renderAssessmentInfo(content, authenticatedUser, station, session.type, result);
            return;
          }
          result.currentQuestionIndex = Math.min(
            Math.max(0, Number(result.currentQuestionIndex) || 0),
            station.questions.length - 1,
          );
          applySavedTimer(result, "timeRemaining", session.timerDeadline);
          await syncResult(result);
          renderQuestionPage(content, station, authenticatedUser, session.type, result);
          return;
        }

        renderAssessmentInfo(content, authenticatedUser, station, session.type, result);
        return;
      }

      if (session.phase === "question-result") {
        const result = await createResultAndWait(authenticatedUser.id, station.id);
        if (result.id !== session.resultId || result.status?.question !== "completed") {
          throw new Error("The saved question result could not be matched.");
        }
        renderResultPage(content, authenticatedUser, station, result, session.type);
        return;
      }
    } else {
      if (session.phase === "procedure-info") {
        renderProcedureInfo(content, station, authenticatedUser, session.type);
        return;
      }

      if (session.phase === "procedure-assessment") {
        const student = getUserById(session.studentId);
        if (!student || student.role !== "student") {
          throw new Error("The saved student is no longer available.");
        }

        const result = await createResultAndWait(student.id, station.id);
        if (
          result.id === session.resultId &&
          result.status?.procedure === "in-progress"
        ) {
          applySavedTimer(result, "procedureTimeRemaining", session.timerDeadline);
          await syncResult(result);
          renderProcedurePage(content, station, student, authenticatedUser, result, session.type);
          return;
        }

        renderProcedureInfo(content, station, authenticatedUser, session.type);
        return;
      }
    }

    throw new Error("The saved assessment state is not recognized.");
  } catch (error) {
    console.error("Unable to restore the saved assessment session:", error);
    clearAuthToken();
    renderLoginPage(content, session.stationId, session.type);
  }
}

function applySavedTimer(result, field, deadline) {
  if (deadline == null || !Number.isFinite(Number(deadline))) return;
  result[field] = Math.max(0, Math.ceil((Number(deadline) - Date.now()) / 1000));
}




