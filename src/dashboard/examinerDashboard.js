import { createResult, addProcedureScore, getResult } from "../app/result.js";
import {
  startProcedureTimer,
  procedureCompleted,
  showConfirmDialog,
  notyf,
  withLoadingOverlay,
  syncResult,
  startAssessmentAutosave,
} from "../utilities/utility.js";
import { renderLoginPage } from "./loginPage.js";
import { renderProcedureInfo } from "./procedureAssessmentInfo.js";
import { getActiveAssessmentTime, updateBrowserSession } from "../session/session.js";
import {
  getMaximumProcedureMarks,
  getMaximumQuestionMarks,
  getProcedureMarksEarned,
} from "../../shared/scoring.js";

export function renderProcedurePage(
  container,
  station,
  student,
  moderator,
  existingResult,
  type,
) {
  let result;

  if (existingResult) {
    result = existingResult;
  } else {
    // Create a fresh procedure attempt when there is no saved result yet.
    result = createResult(student.id, station.id);
    result.procedureTimeRemaining = station.procedureTimer.duration * 60;
  }

  if (station.procedureTimer.enabled) {
    const restoredTime = getActiveAssessmentTime(result, "procedure-assessment");
    if (restoredTime !== null) result.procedureTimeRemaining = restoredTime;
  }

  if (result.procedureTimeRemaining == null) {
    result.procedureTimeRemaining = station.procedureTimer.duration * 60;
  }

  const timerDeadline = station.procedureTimer.enabled
    ? Date.now() + result.procedureTimeRemaining * 1000
    : null;
  updateBrowserSession({
    phase: "procedure-assessment",
    userId: moderator.id,
    role: moderator.role,
    studentId: student.id,
    stationId: station.id,
    type,
    resultId: result.id,
    timerDeadline,
  });

  container.innerHTML = `

        <div class="procedure-page">

            <aside class="procedure-sidebar">
                <button class="logout-btn moderator-logout-btn">
                    Logout
                </button>

                <header class="procedure-header">
                    <div class="moderator-info">
                        <h3>Examiner</h3>
                        <p>${moderator.firstname} ${moderator.surname}</p>
                        <p>${moderator.role}</p>
                    </div>

                    <div class="station-details">
                        <h2>${station.procedureName}</h2>
                        <h2>${station.description}</h2>
                    </div>

                    <div class="student-info">
                        <h3>Student</h3>
                        <p>${student.firstname} ${student.surname}</p>
                        <p>${student.admissionNo}</p>
                    </div>
                </header>

                <footer class="procedure-footer">
                    <div class="answered-count">
                        ${calculateProcedureMarks(station, result).marksAwarded}
                        /
                        ${calculateProcedureMarks(station, result).totalMarks}
                    </div>

                    <div class="procedure-timer">
                        00:00
                    </div>

                    <button class="submit-procedure-btn">
                        Submit Assessment
                    </button>
                </footer>
            </aside>

            <section class="procedure-items">
            </section>

        </div>
    `;

  renderProcedureItems(
    container.querySelector(".procedure-items"),
    station,
    result,
  );
  let stopAutosave = startAssessmentAutosave(result);
  let timer = null;
  let isSubmitting = false;
  const submitAssessment = async () => {
    if (isSubmitting) return;
    isSubmitting = true;
    const previousResult = structuredClone(result);
    stopAutosave();

    try {
      await withLoadingOverlay("Submitting assessment", async () => {
        formulateEachProcedureScore(station, result);
        procedureCompleted(result.id);
        await syncResult(result);

        clearInterval(timer);
        renderProcedureInfo(container, station, moderator, type);
      });
    } catch (error) {
      Object.assign(result, previousResult);
      stopAutosave = startAssessmentAutosave(result);
      console.error("Failed to submit procedure assessment:", error);
      notyf.error(
        error instanceof TypeError
          ? "Could not reach the server. Check your connection and try again."
          : error.message || "Failed to submit the procedure assessment.",
      );
    } finally {
      isSubmitting = false;
    }
  };

  timer = runProcedureTimer(
    result,
    station,
    container.querySelector(".procedure-timer"),
    submitAssessment,
  );

  const logoutBtn = container.querySelector(".logout-btn");
  logoutBtn.addEventListener("click", () => {
    showConfirmDialog({
      title: "Logout",
      message: "Are you sure you want to leave the current student assessment?",

      async onConfirm() {
        try {
          await withLoadingOverlay("Saving assessment", async () => {
            await syncResult(result);

            clearInterval(timer);
            stopAutosave();

            renderProcedureInfo(container, station, moderator, type);
          });
        } catch (error) {
          console.error(error);
        }
      },
    });
  });

  const submitBtn = container.querySelector(".submit-procedure-btn");
  submitBtn.addEventListener("click", (e) => {
    showConfirmDialog({
      title: "Submit Assessment",

      message: "Are you sure you to submit this assessment?",

      onConfirm: submitAssessment,
    });
  });
}


// function renderProcedureItems(container, station, result) {
//   container.innerHTML = "";

//   station.procedureItems.forEach((item, index) => {
//     const savedScore = result.procedureScores[item.id];

//     const isCompleted = Object.prototype.hasOwnProperty.call(
//       result.procedureScores,
//       item.id,
//     );

//     const optionsHtml = item.scoreOptions
//       .map((option) => {
//         return `

//                     <label>

//                         <input
//                             type="radio"
//                             name="${item.id}"
//                             value="${option}"
//                             ${savedScore === option ? "checked" : ""}
//                         >

//                         ${option}

//                     </label>

//                 `;
//       })
//       .join("");

//     container.innerHTML += `

//                 <div class="procedure-item ${isCompleted ? "completed" : ""}">

//                     <h3>
//                         ${index + 1}.
//                         ${item.description}
//                     </h3>

//                     <div class="score-options">
//                         ${optionsHtml}
//                     </div>

//                 </div>
//             `;
//   });

//   setupProcedureEvents(container, result);
// }


// function setupProcedureEvents(container, result) {
//   const radios = container.querySelectorAll(
//     ".procedure-item input[type='radio']",
//   );

//   radios.forEach((radio) => {
//     radio.addEventListener("change", () => {
//       const procedureId = radio.name;

//       result.procedureScores[procedureId] = Number(radio.value);

//       const card = radio.closest(".procedure-item");
//       card.classList.add("completed");

//       syncResult(result);
//     });
//   });
// }



function calculateProcedureMarks(station, result) {
  return {
    marksAwarded: getProcedureMarksEarned(station, result),
    totalMarks: getMaximumProcedureMarks(station),
  };
}



function renderProcedureItems(container, station, result) {
    container.innerHTML = "";

    let itemNumber = 0;

    station.procedureItems.forEach((item, index) => {

        const isSubheading =
            item.scoreOptions.length === 2 &&
            item.scoreOptions.every(option => Number(option) === 0);

        if (!isSubheading) {
          itemNumber++;
        }

        const savedScore = result.procedureScores[item.id];

        const isCompleted = Object.prototype.hasOwnProperty.call(
            result.procedureScores,
            item.id,
        );

        const optionsHtml = isSubheading
            ? ""
            : item.scoreOptions
                .map((option) => {
                    return `
                        <label>
                            <input
                                type="radio"
                                name="${item.id}"
                                value="${option}"
                                ${Number(savedScore) === Number(option) && isCompleted ? "checked" : ""}
                            >
                            ${option}
                        </label>
                    `;
                })
                .join("");

        container.innerHTML += `
            <div class="procedure-item ${isCompleted ? "completed" : ""} ${isSubheading ? "subheading" : ""}">

                <h3 class="${isSubheading ? "subheading-description" : ""}">
                    ${isSubheading ? "" : `${itemNumber}. `}
                    ${item.description}
                </h3>

                <div class="score-options">
                    ${optionsHtml}
                </div>
            </div>
        `;
    });

  setupProcedureEvents(
    container,
    station,
    result,
    document.querySelector(".answered-count")
  );
}


function setupProcedureEvents(container, station, result, scoreDisplay) {
    const radios = container.querySelectorAll(
        ".procedure-item input[type='radio']"
    );

    radios.forEach((radio) => {
        radio.addEventListener("change", async () => {
            const procedureId = radio.name;

            result.procedureScores[procedureId] = Number(radio.value);

            const card = radio.closest(".procedure-item");
            card?.classList.add("completed");

            const { marksAwarded, totalMarks } =
                calculateProcedureMarks(station, result);

            if (scoreDisplay) {
                scoreDisplay.textContent =
                    `${marksAwarded} / ${totalMarks}`;
            }

            const snapshot = structuredClone(result);

            try {
                await syncResult(snapshot);
            } catch (error) {
                console.error("Failed to save procedure score:", error);
                notyf.error(
                  error instanceof TypeError
                    ? "Could not reach the server. This score may not be saved."
                    : error.message || "Failed to save the procedure score.",
                );
            }
        });
    });
}


// function setupProcedureEvents(container, result) {
//     const radios = container.querySelectorAll(
//         ".procedure-item input[type='radio']"
//     );

//     radios.forEach((radio) => {
//         radio.addEventListener("change", async () => {
//             const procedureId = radio.name;

//             result.procedureScores[procedureId] = Number(radio.value);

//             const card = radio.closest(".procedure-item");
//             card?.classList.add("completed");

//             const snapshot = structuredClone(result);

//             try {
//                 await syncResult(snapshot);
//             } catch (error) {
//                 console.error("Failed to save procedure score:", error);
//             }
//         });
//     });
// }


function runProcedureTimer(
  result,
  station,
  timerElement,
  submitAssessment,
) {
  if (station.procedureTimer.enabled) {
    return startProcedureTimer(result, station, timerElement, submitAssessment);
  }
}

function formulateEachProcedureScore(station, result) {
  // Move selected rubric scores from the temporary map into the persisted arrays.
  station.procedureItems.forEach((procedureItem) => {
    const procedureId = procedureItem.id;
    const selectedScore = result.procedureScores[procedureId] ?? 0;
    const possibleMark = Math.max(
      0,
      ...(procedureItem.scoreOptions || []).map((option) => Number(option) || 0),
    );
    addProcedureScore(result.id, procedureId, selectedScore, possibleMark);
  });

  const finalResult = getResult(result.id);
  finalResult.calculateTotal(
    getMaximumProcedureMarks(station),
    getMaximumQuestionMarks(station),
  );
}
