import { getStudentByAdmissionNo } from "../app/users.js";
import { showNoticeDialog, showConfirmDialog } from "../utilities/utility.js";
import { createResult, getStudentResults } from "../app/result.js";
import { renderProcedurePage } from "./examinerDashboard.js";
import { renderLoginPage } from "./loginPage.js";
import logo from "../asset/images/umcons-logo.jpg";

export function renderProcedureInfo(container, station, moderator, type) {

    container.innerHTML = `

        <div class="procedure-info">

            <button class="logout-btn moderator-logout-btn">
                Logout
            </button>

            <div class="moderator-info procedure-info-card">

                <h1>
                    Examiner: 
                    ${moderator.firstname} ${moderator.surname}
                </h1>

                <p>
                    Role:
                    ${moderator.role}
                </p>

            </div>

            <div class="station-info procedure-info-card">

                <h1>Procedure ${station.name}</h1>

                <p>
                    Procedure Items:
                    ${station.procedureItems.length}
                </p>

                <p>
                    Duration:
                    ${station.procedureTimer.duration}
                    Minutes
                </p>

            </div>

            <div class="student-search-card">

                <h2>
                    Search Student
                </h2>

                <div class="search-wrapper">

                    <input
                    type="text"
                    class="student-search-input"
                    placeholder="Enter Student ID"
                    required
                    >

                    <button class="search-student-btn">

                    Search

                    </button>

                </div>

                
            </div>

        </div>
    `;

    setupProcedureInfoEvents(container, station, moderator, type);

    const logout = container.querySelector(".logout-btn");
    logout.addEventListener("click", () => {

        showConfirmDialog({
            title: "Logout",
            message: "Are you sure you want to leave the current student assessment?",

            onConfirm() {
                renderLoginPage(container, station.id, type);
            }
        });
    })
}




function setupProcedureInfoEvents(container, station, moderator, type) {

    const searchBtn = container.querySelector(".search-student-btn");

    searchBtn.addEventListener("click", () => {

        const admissionNo = container.querySelector(
            ".student-search-input").value.trim();

        const student = getStudentByAdmissionNo(admissionNo);

        if(!student){

            showNoticeDialog({
                title: "Student Not Found",
                message: "No student was found with that admission number."
                });

                return;
            }

            if(!station.procedureItems.length){

            showNoticeDialog({
                title: "Assessment Unavailable",
                message: "There are currently no checklist item available for this assessment."
            });

            return;
        } 
        
    
        showConfirmDialog({
            title: "Confirm Student",
            message: `
                <div class="student-preview">
                    <div class="student-image">
                        ${
                            student.image
                            ? `<img src="${student.image}">`
                            : `<img src="${logo}">`
                        }
                    </div>
                    <p>
                        <strong>Name:</strong>
                        ${student.firstname}
                        ${student.surname}
                    </p>
                    <p>
                        <strong>Admission No:</strong>
                        ${student.admissionNo}
                    </p>
                    <p>
                        Is this the correct student?
                    </p>
                </div>
            `,

            onConfirm() {

                const existingResult = getStudentResults(student.id, station.id);


                if(existingResult && existingResult.status.procedure === "completed") {

                    showNoticeDialog({
                    title:
                    "Assessment Completed",
                    message:
                    "You have already completed the checklist for this student."
                    });

                    return;

                }
        
                renderProcedurePage(container, station, student, moderator, existingResult, type);
            }
        });
    });
};