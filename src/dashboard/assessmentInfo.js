import { renderQuestionPage } from "./studentDashboard.js";
import { renderLoginPage } from "./loginPage.js";
import { showConfirmDialog, showNoticeDialog } from "../utilities/utility.js";
import { getStudentResults } from "../app/result.js";

export function renderAssessmentInfo(
    container,
    user,
    station,
    type,
    existingResult
) {

    
    container.innerHTML = `

        <div class="assessment-info-page">

            <div class="assessment-card">

                <h2>

                    User Information

                </h2>

                <div class="user-profile-card">

                    <div class="user-image-wrapper">

                        <img
                        src="${
                            user.image ||
                            "../assets/default-avatar.png"
                        }"

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
                            ${
                                user.admissionNo
                                || "-"
                            }

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

                        <strong>Station:</strong>

                        ${station.name}

                    </p>

                    <p>

                        <strong>Total ${type}:</strong>

                        ${
                            type==="question"
                            ?
                            station.questions.length
                            :
                            station.procedureItems.length
                        }

                    </p>

                    <p>

                        <strong>Time:</strong>

                        ${
                            type==="question"
                            ?
                            station.questionTimer.duration
                            :
                            station.procedureTimer.duration
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

    startBtn.addEventListener("click", () => {

            if(!station.questions.length){

            showNoticeDialog({
                title: "Assessment Unavailable",
                message: "There are currently no questions available for this assessment."
            });
            return;
        } 
        
    if(existingResult) {

        if(existingResult.status.question === "completed") {

             showNoticeDialog({

            title:
            "Assessment Completed",

            message:
            "You have already completed this station."
        });

        return;

        }
    }

     renderQuestionPage(container, station, user, type, existingResult);
    });

  
    const logoutBtn = container.querySelector(".logout-btn");
    logoutBtn.addEventListener("click", () => {

        showConfirmDialog({

            title: "Logout",

            message: "Are you sure you want to leave this assessment?",

            onConfirm() {

                renderLoginPage(
                    container,
                    station.id,
                    type
                );

            }

        });

    }
);

}