import { createResult, addProcedureScore, getResult} from "../app/result.js";
import { startProcedureTimer, procedureCompleted, showConfirmDialog } from "../utilities/utility.js";
import { renderLoginPage } from "./loginPage.js";
import { renderProcedureInfo } from "./procedureAssessmentInfo.js";


export function renderProcedurePage(container, station, student, moderator,
    existingResult, type) {

    let result;
    
    if(existingResult) {
        result = existingResult;
    } else {
        result = createResult(student.id, station.id);
        result.procedureTimeRemaining = station.procedureTimer.duration * 60;
    }

    container.innerHTML = `

        <div class="procedure-page">

            <button class="logout-btn moderator-logout-btn">
                Logout
            </button>

            <header class="procedure-header">

                <div class="moderator-info">

                    <h3>
                        Examiner
                    </h3>

                    <p>
                        ${moderator.firstname}
                        ${moderator.surname}
                    </p>

                    <p>
                        ${moderator.role}
                    </p>

                </div>

                <div class="station-details">

                    <h2>
                        Procedure ${station.name}
                    </h2>

                </div>

                <div class="student-info">

                    <h3>
                        Student
                    </h3>

                    <p>
                        ${student.firstname}
                        ${student.surname}
                    </p>

                    <p>
                        ${student.admissionNo}
                    </p>

                </div>

            </header>


            <section class="procedure-items">

            </section>


            <footer class="procedure-footer">

                <div class="answered-count">

                    Answered:
                    0 /
                    ${station.procedureItems.length}

                </div>

                 <div class="procedure-timer">
                    00:00
                </div>

                <button class="submit-procedure-btn">
                    Submit Assessment
                </button>

            </footer>

        </div>
    `;


    renderProcedureItems(
        container.querySelector(".procedure-items"), station, result);

    const timer = runProcedureTimer(container, container.querySelector(".procedure-timer"), station, student, result, moderator, type);

    const logoutBtn = container.querySelector(".logout-btn");
    logoutBtn.addEventListener("click", () => {

        showConfirmDialog({
            title: "Logout",
            message: "Are you sure you want to leave the current student assessment?",

            onConfirm() {

                clearInterval(timer)

                renderProcedureInfo(
                    container,
                    station,
                    moderator,
                    type
                );
            }
        });
    });


    const submitBtn = container.querySelector(".submit-procedure-btn");
    submitBtn.addEventListener("click", (e) => {

        console.log("heyyyyyy")
        showConfirmDialog({

            title: "Submit Assessment",

            message: "Are you sure you to submit this assessment?",

            onConfirm() {

                formulateEachProcedureScore(station, result);
                procedureCompleted(result.id)
                clearInterval(timer);
                renderProcedureInfo(container, station, moderator, type);
            }
        });
    })

}




function renderProcedureItems(container, station, result) {

    container.innerHTML = "";

    station.procedureItems.forEach((item, index) => {

        const savedScore = result.procedureScores[item.id];

        const isCompleted = result.procedureScores[item.id];

            const optionsHtml = item.scoreOptions.map(option => {

                return `

                    <label>

                        <input
                            type="radio"
                            name="${item.id}"
                            value="${option}"
                            ${
                                savedScore === option
                                ? "checked"
                                : ""
                            }
                        >

                        ${option}

                    </label>

                `;

            }).join("");

            container.innerHTML += `

                <div class="procedure-item ${isCompleted ? "completed" : ""}">

                    <h3>
                        ${index + 1}.
                        ${item.description}
                    </h3>

                    <div class="score-options">
                        ${optionsHtml}
                    </div>

                </div>
            `;
        }
    );

    setupProcedureEvents(container, result);

}




function setupProcedureEvents(container, result) {

    const radios = container.querySelectorAll(".procedure-item input[type='radio']");

    radios.forEach(radio => {

        radio.addEventListener("change", () => {

            const procedureId = radio.name;

            result.procedureScores[procedureId] = Number(radio.value);

            const card = radio.closest(".procedure-item");
            card.classList.add("completed");
        });
    });
}





function runProcedureTimer(container, timerElement, station, user, result, moderator, type) {

    if (station.procedureTimer.enabled) {

       return startProcedureTimer(result, station, timerElement, () => {

            formulateEachProcedureScore(station, result);
            procedureCompleted(result.id);
            renderProcedureInfo(container, station, moderator, type);

        });
    }
}





function formulateEachProcedureScore(station, result) {

        station.procedureItems.forEach(procedureItem => {

        const procedureId = procedureItem.id;
        const selectedScore = result.procedureScores[procedureId];

        if (selectedScore) {

            addProcedureScore(result.id, procedureId, selectedScore);

        }
    });

    const finalResult = getResult(result.id)
    finalResult.calculateTotal(station.procedureItems.length, station.questions.length)

    console.log(finalResult);
}