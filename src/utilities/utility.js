import { getResult } from "../app/result.js";
import { Notyf } from "notyf";
import "notyf/notyf.min.css";
import { addResultToLocalStorage } from "../app/localStorage.js";

export const notyf = new Notyf({
  duration: 1000,
  position: {
    x: "center",
    y: "top",
  },
  types: [
    {
      type: "warning",
      background: "orange",
      icon: {
        className: "material-icons",
        tagName: "i",
        text: "warning",
      },
    },
    {
      type: "error",
      background: "indianred",
      duration: 10000,
      dismissible: true,
    },
  ],
});

export function formatStr(str) {
  return str.trim().toLocaleLowerCase();
}

export function showSubmitDialog({
  totalQuestions,
  answeredQuestions,
  unansweredQuestions,
  onConfirm,
}) {
  const dialog = document.createElement("dialog");

  dialog.classList.add("submit-dialog");

  dialog.innerHTML = `

        <div class="submit-dialog-content">

            <h2>
                Submit Assessment
            </h2>

            <p>
                Total Questions:
                ${totalQuestions}
            </p>

            <p>
                Answered:
                ${answeredQuestions}
            </p>

            <p>
                Unanswered:
                ${unansweredQuestions.length}
            </p>

            <p>
                Are you sure you want
                to submit this assessment?
            </p>

            <div class="dialog-actions">

                <button
                class="cancel-dialog-btn">

                    Cancel

                </button>

                <button
                class="submit-dialog-btn">

                    Submit

                </button>

            </div>

        </div>

    `;

  document.body.appendChild(dialog);

  dialog.showModal();

  dialog.querySelector(".cancel-dialog-btn").addEventListener("click", () => {
    dialog.close();
    dialog.remove();
  });

  dialog.querySelector(".submit-dialog-btn").addEventListener("click", () => {
    dialog.close();
    dialog.remove();

    onConfirm?.();
  });
}

export function showConfirmDialog({ title, message, onConfirm }) {
  const dialog = document.createElement("dialog");

  dialog.innerHTML = `

        <div class="confirm-dialog">

            <h2>${title}</h2>

            <p>${message}</p>

            <div class="dialog-actions">

                <button
                    class="cancel-btn">

                    Cancel

                </button>

                <button
                    class="confirm-btn">

                    Confirm

                </button>

            </div>

        </div>

    `;

  document.body.appendChild(dialog);

  dialog.showModal();

  dialog.querySelector(".cancel-btn").addEventListener("click", () => {
    dialog.close();
    dialog.remove();
  });

  dialog.querySelector(".confirm-btn").addEventListener("click", () => {
    dialog.close();
    dialog.remove();

    onConfirm?.();
  });
}

export function showNoticeDialog({ title, message }) {
  const dialog = document.createElement("dialog");

  dialog.innerHTML = `

        <div class="notice-dialog">

            <div class="dialog-icon">
                ℹ️
            </div>

            <h2>
                ${title}
            </h2>

            <p>
                ${message}
            </p>

            <button
                class="notice-btn">

                OK

            </button>

        </div>

    `;

  document.body.appendChild(dialog);

  dialog.showModal();

  dialog.querySelector(".notice-btn").addEventListener("click", () => {
    dialog.close();
    dialog.remove();
  });
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);

  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function startQuestionTimer(result, station, timerElement, onTimeUp) {
  let timeRemaining = result.timeRemaining;

  timerElement.textContent = formatTime(timeRemaining);

  const timerId = setInterval(() => {
    timeRemaining--;

    result.timeRemaining = timeRemaining;

    timerElement.textContent = formatTime(timeRemaining);

    if (timeRemaining <= 0) {
      clearInterval(timerId);

      onTimeUp?.();
    }
  }, 1000);

  return timerId;
}

export function questionCompleted(resultId) {
  const result = getResult(resultId);

  if (!result) return false;

  result.status.question = "completed";

  return true;
}

export function procedureCompleted(resultId) {
  const result = getResult(resultId);

  if (!result) return false;

  result.status.procedure = "completed";

  return true;
}

export function startProcedureTimer(result, station, timerElement, onTimeUp) {
  let timeRemaining = result.procedureTimeRemaining;

  timerElement.textContent = formatTime(timeRemaining);

  const timerId = setInterval(() => {
    timeRemaining--;

    result.procedureTimeRemaining = timeRemaining;

    timerElement.textContent = formatTime(timeRemaining);

    if (timeRemaining <= 0) {
      clearInterval(timerId);

      onTimeUp?.();
    }
  }, 1000);

  return timerId;
}

export function updateResult() {
  addResultToLocalStorage();
}

export function updateResultAtRegularInterval() {
  const timerId = setInterval(() => {
    updateResult();
  }, 10000);
  return timerId;
}
