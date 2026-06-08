import { addQuestionScore, createResult, getResult } from "../app/result.js";
import { getStationById } from "../app/stationManager.js";
import { showSubmitDialog, showConfirmDialog, startQuestionTimer, questionCompleted } from "../utilities/utility.js";
import { renderLoginPage } from "./loginPage.js";


export function renderQuestionPage(container, station, user, type, existingResult) {

    let result;

    if(existingResult) {
        result = existingResult;
    } else {
        result = createResult(user.id, station.id);
        result.timeRemaining = station.questionTimer.duration * 60;
    }

    container.innerHTML = `

        <div class="question-page">

            <div class="question-header">
                <div>
                    <h1>
                        ${station.name}
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

    renderNavigations(station, ".question-nav")

    const navContainer = container.querySelector(".question-nav");

    navContainer.addEventListener("click", (e) => {

            const btn = e.target.closest("button");

            if(!btn) return;

            result.currentQuestionIndex = Number(btn.dataset.index);

            renderQuestion(container.querySelector(".question-content"),
                station, result);
        }
    );

    const nextQuestion = document.querySelector(".next-btn");
    const prevQuestion = document.querySelector(".prev-btn");


    nextQuestion.addEventListener("click", () => {

        if(result.currentQuestionIndex < station.questions.length - 1){

            result.currentQuestionIndex++;

            renderQuestion(container.querySelector(".question-content"), station, result);

        }

    });

    prevQuestion.addEventListener("click", () => {

        if(result.currentQuestionIndex > 0){

            result.currentQuestionIndex--;

            renderQuestion(container.querySelector(".question-content"), station, result);
        }
    });


    const submitBtn = container.querySelector(".submit-btn");

    submitBtn.addEventListener("click", () => {

        const unansweredQuestions = getUnansweredQuestions(station, result);

        showSubmitDialog({

            totalQuestions:
            station.questions.length,

            answeredQuestions:
            Object.keys(result.studentAnswers).length,

            unansweredQuestions,

            onConfirm() {

               formulateEachQuestionScore(container, user, station, result)
               questionCompleted(result.id)
            }

        });

    });

    // timer logic
    const timer = runQuestionTimer(container, container.querySelector(".question-timer"), station, user, result);

    // const timerElement = container.querySelector(".question-timer");

    // if (station.questionTimer.enabled) {

    //     startQuestionTimer(result, station, timerElement, () => {

    //         formulateEachQuestionScore(container, user, station, result)
    //         questionCompleted(result.id)

    //     });

    // } 

    const logoutBtn = container.querySelector(".logout-btn");
    logoutBtn.addEventListener("click", () => {

        showConfirmDialog({

            title: "Logout",

            message: "Are you sure you want to leave this assessment?",

            onConfirm() {

                clearInterval(timer)

                renderLoginPage(
                    container,
                    station.id,
                    type
                );

            }

        });
    });

};





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

        ${question.options.map(option => `
            <label>

                <input
                    type="radio"
                    name="${question.id}"
                    value="${option}"
                    ${savedAnswer === option ? "checked" : ""}
                >

                ${option}

            </label>
        `).join("")}

        </div>

    `;

    setupQuestionEvents(container, station, result)

}




function renderNavigations(station, selector) {

    const isQuestionsAvailable = station.questions.length;

    if(!isQuestionsAvailable) return;

     const container = document.querySelector(selector);

    station.questions.forEach((question, index) => {

        const btn = document.createElement("button");

        btn.textContent = index + 1;

        btn.dataset.index = index;

        container.appendChild(btn)
    })

}




function setupQuestionEvents(container, station, result) {

    const index = result.currentQuestionIndex;
    const question = station.questions[index];

    const radios = container.querySelectorAll('input[type="radio"]');

    radios.forEach(radio => {

        radio.addEventListener("change", () => {

            result.studentAnswers[question.id] = radio.value;

            const navBtn = document.querySelector(`[data-index="${index}"]`);

            navBtn.classList.add("answered");

            }
        );
    });
}



function getUnansweredQuestions(station, result) {

    const unanswered = [];

    station.questions.forEach(

        (question, index) => {

            if(!result.studentAnswers[question.id]) {
                unanswered.push(
                    index + 1
                );
            }

        }
    );

    return unanswered;

}


// formulate score for each station question

function formulateEachQuestionScore(container, user, station, result) {

        station.questions.forEach(question => {

        const selectedAnswer = result.studentAnswers[question.id];

        const score = selectedAnswer === question.answer
            ? question.mark
            : 0;

        addQuestionScore(result.id, question.id, score);

    });


    const finalResult = getResult(result.id)
    finalResult.calculateTotal(station.procedureItems.length, station.questions.length)

    renderResultPage(container, user, station, finalResult)

}




function renderResultPage(container, user, station, result) {

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
                        <strong>Score:</strong>
                        ${result.questionTotal}
                    </p>

                    <p>
                        <strong>Percentage:</strong>
                        ${result.questionPercentage.toFixed(1)}%
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
        if(targetbtn) {
            renderLoginPage(container, station.id)
        }
    })
}


function runQuestionTimer(container, timerElement, station, user, result) {

    if (station.questionTimer.enabled) {

       return startQuestionTimer(result, station, timerElement, () => {

            formulateEachQuestionScore(container, user, station, result)
            questionCompleted(result.id)

        });
    }
}