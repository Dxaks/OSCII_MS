import { renderQuestionPage } from "./studentDashboard.js";
import { renderLoginPage } from "./loginPage.js";
import { showConfirmDialog, showNoticeDialog } from "../utilities/utility.js";
import logo from "../asset/icons/account-circle.svg";
import { clearAuthToken } from "../app/backendApi.js";
import { createResultAndWait } from "../app/result.js";
import { updateBrowserSession } from "../session/session.js";

export function renderAssessmentInfo(
  container,
  user,
  station,
  type,
  existingResult,
) {
  updateBrowserSession({
    phase: "question-info",
    userId: user.id,
    role: user.role,
    stationId: station.id,
    type,
    resultId: null,
    timerDeadline: null,
  });

  container.innerHTML = `

        <div class="assessment-info-page">

            <div class="assessment-card">

                <h2>

                    User Information

                </h2>

                <div class="user-profile-card">

                    <div class="user-image-wrapper">

                        <img
                        src="${user.image || logo}"

                        alt="profile image"

                        class="user-profile-image"
                        >

                    </div>

                    <div class="user-details">

                        <h3>

                            ${user.firstname}
                            ${user.surname}

                        </h3>

                        <p>

                            Admission No:
                            ${user.admissionNo || "-"}

                        </p>

                        <p>

                            Role:
                            ${user.role}

                        </p>

                    </div>

                </div>

                <hr>

                <h2>

                    Assessment Information

                </h2>

                <div class="assessment-details">

                    <p>
                        ${station.questionName}
                    </p>

                    <p>
                        ${station.description}
                    </p>

                    <p>

                        <strong>Total ${type}:</strong>

                        ${
                          type === "question"
                            ? station.questions.length
                            : station.procedureItems.length
                        }

                    </p>

                    <p>

                        <strong>Time:</strong>

                        ${
                          type === "question"
                            ? station.questionTimer.duration
                            : station.procedureTimer.duration
                        }
                        minutes

                    </p>

                </div>

                <button
                class="start-assessment-btn">

                    ${existingResult && existingResult.status.question === "in-progress" ? "Resume Assessment" : "Start Assessment"}

                </button>

            </div>

            <button class="logout-btn">
                Logout
            </button>

        </div>
    `;

  const startBtn = container.querySelector(".start-assessment-btn");

  startBtn.addEventListener("click", async () => {
    if (!station.questions.length) {
      showNoticeDialog({
        title: "Assessment Unavailable",
        message:
          "There are currently no questions available for this assessment.",
      });
      return;
    }

    // Prevent multiple clicks while creating the result.
    startBtn.disabled = true;
    const originalText = startBtn.textContent;
    startBtn.textContent = "Preparing Assessment...";

    try {
      // Always ask PostgreSQL for the latest attempt. The browser may have
      // been left open while another computer saved this student's progress.
      const result = await createResultAndWait(user.id, station.id);

      if (result.status.question === "completed") {
        showNoticeDialog({
          title: "Assessment Completed",
          message: "You have already completed this station.",
        });
        startBtn.disabled = false;
        startBtn.textContent = originalText;
        return;
      }

      updateBrowserSession({
        phase: "question-assessment",
        userId: user.id,
        role: user.role,
        stationId: station.id,
        type,
        resultId: result.id,
        timerDeadline: null,
      });
      renderQuestionPage(container, station, user, type, result);
    } catch (error) {
      console.error("Failed to prepare assessment:", error);

      showNoticeDialog({
        title: "Unable to Start Assessment",
        message:
          "Your assessment could not be saved to the server. Please check your connection and try again.",
      });

      startBtn.disabled = false;
      startBtn.textContent = originalText;
    }
  });


  const logoutBtn = container.querySelector(".logout-btn");
  logoutBtn.addEventListener("click", () => {
    showConfirmDialog({
      title: "Logout",

      message: "Are you sure you want to leave this assessment?",

      onConfirm() {
        clearAuthToken();
        renderLoginPage(container, station.id, type);
      },
    });
  });
}
