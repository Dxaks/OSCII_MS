import { addQuestionScore, createResult, getResult } from "../app/result.js";
import { getStationById } from "../app/stationManager.js";
import { clearAuthToken } from "../app/backendApi.js";
import {
  showSubmitDialog,
  showConfirmDialog,
  withLoadingOverlay,
  startQuestionTimer,
  questionCompleted,
  syncResult,
  startAssessmentAutosave,
  notyf,
} from "../utilities/utility.js";
import { renderLoginPage } from "./loginPage.js";
import { getActiveAssessmentTime, updateBrowserSession } from "../session/session.js";
import {
  getMaximumProcedureMarks,
  getMaximumQuestionMarks,
} from "../../shared/scoring.js";

export function renderQuestionPage(
  container,
  station,
  user,
  type,
  existingResult,
) {
  let result;

  if (existingResult) {
    result = existingResult;
  } else {
    // Create a fresh attempt when the student has not started this station before.
    result = createResult(user.id, station.id);
    result.timeRemaining = station.questionTimer.duration * 60;
  }

  if (station.questionTimer.enabled) {
    const restoredTime = getActiveAssessmentTime(result, "question-assessment");
    if (restoredTime !== null) result.timeRemaining = restoredTime;
  }

  if (result.timeRemaining == null) {
    result.timeRemaining = station.questionTimer.duration * 60;
  }

  if (station.questions.length > 0) {
    result.currentQuestionIndex = Math.min(
      Math.max(0, Number(result.currentQuestionIndex) || 0),
      station.questions.length - 1,
    );
  }

  const timerDeadline = station.questionTimer.enabled
    ? Date.now() + result.timeRemaining * 1000
    : null;
  updateBrowserSession({
    phase: "question-assessment",
    userId: user.id,
    role: user.role,
    stationId: station.id,
    type,
    resultId: result.id,
    timerDeadline,
  });

  container.innerHTML = `

        <div class="question-page">

            <div class="question-header">
                <div>
                    <h1>
                        ${station.questionName}
                    </h1>

                    <p>
                        ${user.firstname}
                        ${user.surname}
                    </p>

                </div>

                <div class="question-timer">
                    00:00
                </div>

                <button class="logout-btn">
                    Logout
                </button>

            </div>


            <div class="question-container">

                <aside class="question-nav"> </aside>

                <section class="question-content"> </section>

            </div>

            <div class="question-controls">

                <button class="prev-btn"> Previous </button>

                <button class="submit-btn"> Submit </button>

                <button class="next-btn"> Next </button>

            </div>

        </div>
    `;

  renderQuestion(container.querySelector(".question-content"), station, result);

  renderNavigations(station, ".question-nav", result);
  let stopAutosave = startAssessmentAutosave(result);

  const navContainer = container.querySelector(".question-nav");
  navContainer.addEventListener("click", (e) => {
    const btn = e.target.closest("button");

    if (!btn) return;

    result.currentQuestionIndex = Number(btn.dataset.index);
    void syncResult(structuredClone(result)).catch((error) => {
      console.error("Failed to save current question:", error);
    });

    renderQuestion(
      container.querySelector(".question-content"),
      station,
      result,
    );
  });

  const nextQuestion = document.querySelector(".next-btn");
  const prevQuestion = document.querySelector(".prev-btn");

  nextQuestion.addEventListener("click", () => {
    if (result.currentQuestionIndex < station.questions.length - 1) {
      result.currentQuestionIndex++;
      void syncResult(structuredClone(result)).catch((error) => {
        console.error("Failed to save current question:", error);
      });

      renderQuestion(
        container.querySelector(".question-content"),
        station,
        result,
      );
    }
  });

  prevQuestion.addEventListener("click", () => {
    if (result.currentQuestionIndex > 0) {
      result.currentQuestionIndex--;
      void syncResult(structuredClone(result)).catch((error) => {
        console.error("Failed to save current question:", error);
      });

      renderQuestion(
        container.querySelector(".question-content"),
        station,
        result,
      );
    }
  });

  // Timer completion triggers scoring and marks the attempt as finished.
  let timer = null;
  let isSubmitting = false;
  const submitAssessment = async () => {
    if (isSubmitting) return;
    isSubmitting = true;
    const previousResult = structuredClone(result);
    stopAutosave();

    try {
      await withLoadingOverlay("Submitting assessment", async () => {
        const finalResult = formulateEachQuestionScore(station, result);
        questionCompleted(result.id);
        await syncResult(result);

        clearInterval(timer);
        renderResultPage(container, user, station, finalResult, type);
      });
    } catch (error) {
      Object.assign(result, previousResult);
      stopAutosave = startAssessmentAutosave(result);
      console.error("Failed to submit question assessment:", error);
      notyf.error(
        error instanceof TypeError
          ? "Could not reach the server. Check your connection and try again."
          : error.message || "Failed to submit the question assessment.",
      );
    } finally {
      isSubmitting = false;
    }
  };

  timer = runQuestionTimer(
    result,
    station,
    container.querySelector(".question-timer"),
    submitAssessment,
  );

  const logoutBtn = container.querySelector(".logout-btn");
  logoutBtn.addEventListener("click", () => {
    showConfirmDialog({
      title: "Logout",

      message: "Are you sure you want to leave this assessment?",

      async onConfirm() {
        try {
          await withLoadingOverlay("Saving assessment", async () => {
            await syncResult(result);
            clearInterval(timer);
            stopAutosave();

            clearAuthToken();
            renderLoginPage(container, station.id, type);
          });
        } catch (error) {
          console.error(error);
        }
      },
    });
  });

  const submitBtn = container.querySelector(".submit-btn");

  submitBtn.addEventListener("click", () => {
    const unansweredQuestions = getUnansweredQuestions(station, result);

    showSubmitDialog({
      totalQuestions: station.questions.length,

      answeredQuestions: Object.keys(result.studentAnswers).length,

      unansweredQuestions,

      onConfirm: submitAssessment,
    });
  });
}

function renderQuestion(container, station, result) {
  const index = result.currentQuestionIndex;

  const question = station.questions[index];
  const savedAnswer = result.studentAnswers[question.id];

  container.innerHTML = `

        <h2> Question ${index + 1} of
        ${station.questions.length}
        </h2>

        <p>
        ${question.description}
        </p>

        <div class="question-options">

        ${question.options
          .map(
            (option) => `
            <label>

                <input
                    type="radio"
                    name="${question.id}"
                    value="${option}"
                    ${savedAnswer === option ? "checked" : ""}
                >

                ${option}

            </label>
        `,
          )
          .join("")}

        </div>

    `;

  setupQuestionEvents(container, station, result);
}

function renderNavigations(station, selector, result) {
  const isQuestionsAvailable = station.questions.length;

  if (!isQuestionsAvailable) return;

  const container = document.querySelector(selector);

  station.questions.forEach((question, index) => {
    const btn = document.createElement("button");

    btn.textContent = index + 1;

    btn.dataset.index = index;

    if (result.studentAnswers[question.id]) {
      btn.classList.add("answered");
    }

    container.appendChild(btn);
  });
}

// function setupQuestionEvents(container, station, result) {
//   const index = result.currentQuestionIndex;
//   const question = station.questions[index];

//   const radios = container.querySelectorAll('input[type="radio"]');

//   radios.forEach((radio) => {
//     radio.addEventListener("change", () => {
//       result.studentAnswers[question.id] = radio.value;

//       const navBtn = document.querySelector(`[data-index="${index}"]`);

//       navBtn.classList.add("answered");
      
//       syncResult(result)
//     });
//   });
// }


function setupQuestionEvents(container, station, result) {
    const index = result.currentQuestionIndex;
    const question = station.questions[index];

    const radios = container.querySelectorAll('input[type="radio"]');

    radios.forEach((radio) => {
        radio.addEventListener("change", async () => {
            result.studentAnswers[question.id] = radio.value;

            const navBtn = document.querySelector(
                `[data-index="${index}"]`
            );

            navBtn?.classList.add("answered");

            // Capture the data as it exists right now.
            const snapshot = structuredClone(result);

            try {
                await syncResult(snapshot);
            } catch (error) {
                console.error("Failed to save student answer:", error);
                notyf.error(
                  error instanceof TypeError
                    ? "Could not reach the server. Your answer may not be saved."
                    : error.message || "Failed to save your answer.",
                );
            }
        });
    });
}

function getUnansweredQuestions(station, result) {
  const unanswered = [];

  station.questions.forEach((question, index) => {
    if (!result.studentAnswers[question.id]) {
      unanswered.push(index + 1);
    }
  });

  return unanswered;
}

// formulate score for each station question

function formulateEachQuestionScore(station, result) {
  station.questions.forEach((question) => {
    const selectedAnswer = result.studentAnswers[question.id];

    const score = selectedAnswer === question.answer ? Math.max(0, Number(question.mark) || 0) : 0;

    addQuestionScore(
      result.id,
      question.id,
      score,
      Math.max(0, Number(question.mark) || 0),
    );
  });

  const finalResult = getResult(result.id);
  finalResult.calculateTotal(
    getMaximumProcedureMarks(station),
    getMaximumQuestionMarks(station),
  );
  return finalResult;
}

export function renderResultPage(container, user, station, result, type) {
  updateBrowserSession({
    phase: "question-result",
    userId: user.id,
    role: user.role,
    stationId: station.id,
    type,
    resultId: result.id,
    timerDeadline: null,
  });

  container.innerHTML = `

        <div class="result-page">

            <div class="result-card">

                <div class="result-icon">
                    ✓
                </div>

                <h1>
                    Assessment Completed
                </h1>

                <div class="result-details">

                    <p>
                        <strong>Student:</strong>
                        ${user.firstname}
                        ${user.surname}
                    </p>

                    <p>
                        <strong>Admission No:</strong>
                        ${user.admissionNo}
                    </p>

                    <p>
                        <strong>Station:</strong>
                        ${station.name}
                    </p>

                    <p>

                    </p>

                    <p>

                    </p>

                </div>

                <button
                    class="result-home-btn"
                >
                    Back To Menu
                </button>

            </div>

        </div>

    `;

  const logOut = container.querySelector(".result-home-btn");

  logOut.addEventListener("click", (e) => {
    const targetbtn = e.target.closest(".result-home-btn");
    if (targetbtn) {
      clearAuthToken();
      renderLoginPage(container, station.id, type);
    }
  });
}

function runQuestionTimer(result, station, timerElement, submitAssessment) {
  if (station.questionTimer.enabled) {
    return startQuestionTimer(result, station, timerElement, submitAssessment);
  }
}
