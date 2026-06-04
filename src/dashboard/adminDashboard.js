import { saveStation, createStation, getAllStations, getStationById, addProcedureToStation, addQuestionToStation, setProcedureTimerDuration, toggleProcedureTimer, setQuestionTimerDuration, toggleQuestionTimer } from "../app/stationManager.js";

import { createUser, getUserById, getAllUsers } from "../app/users.js";
import { renderHomePage } from "./homePage.js";



export function renderAdminDashboard(container) {

  container.innerHTML = `

    <button class="back-btn back-to-home" data-admin-action="back-to-home">
      ← Back
    </button>
      
    <section class="dashboard admin-dashboard">
      <h1>Admin Dashboard</h1>
      <p>Manage stations, users, checklist items, and student questions.</p>

      <div class="dashboard-grid admin-menu">
        <button class="dashboard-card" data-admin-action="create-station">
          Create Station
        </button>

        <button class="dashboard-card" data-admin-action="view-stations">
          View Stations
        </button>

        <button class="dashboard-card" data-admin-action="users">
          Users
        </button>

        <button class="dashboard-card" data-admin-action="add-user">
          Add User
        </button>
      </div>

      <div id="admin-content">
        <p>Select an admin action above.</p>
      </div>
    </section>
  `;

   setupAdminEvents();

}



// second level
function setupAdminEvents() {

  const container = document.querySelector("#content");
  const backBtn = container.querySelector(".back-to-home")
  backBtn.addEventListener("click", () => {
    renderHomePage(container);
  })

  const adminMenu = document.querySelector(".admin-menu");
  const adminContent = document.querySelector("#admin-content");

  adminMenu.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const page = btn.dataset.adminAction;

    if (page === "create-station") {
        showCreateStationModal();
    }

    if (page === "view-stations") {
      renderViewStations(adminContent);
    }

    if (page === "users") {
      renderUsers(container);
    }

    if (page === "add-user") {
        showAddUserModal();
    }
  });
}



// view stations screen
function renderViewStations(container) {
  
  container.innerHTML = '';

  const section = document.createElement('section');
  section.className = 'admin-page';

  const allStations = document.createElement('h2');
  allStations.textContent = 'All Stations';
  section.appendChild(allStations)

  const stationList = document.createElement('div');
  stationList.className = 'station-list';
  
  const stations = Object.values(getAllStations());

  stations.forEach((station) => {
    const article = document.createElement('article');
    article.className = 'station-card'

    const stationHeader = document.createElement('h3');
    stationHeader.className = 'station-card-header';
    stationHeader.textContent = `${station.name}`;
    article.appendChild(stationHeader)

    const stationDescription = document.createElement('p');
    stationDescription.className = 'station-description';
    stationDescription.textContent = `${station.description}`;
    article.appendChild(stationDescription)

    const enterStationBtn = document.createElement('button');
    enterStationBtn.className = 'enter-station-btn';
    enterStationBtn.textContent = 'Enter Station'
    enterStationBtn.dataset.station = station.id;
    article.appendChild(enterStationBtn)

    enterStationBtn.addEventListener('click', () => {
      const content = document.querySelector('#content');
      renderStationPage(content, station.id);
    });

    stationList.appendChild(article);
  });

  section.appendChild(stationList)
  container.appendChild(section)
};






// html modal

function openModal(title, formHtml) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="close-modal-btn" type="button">×</button>
      </div>

      ${formHtml}
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".close-modal-btn").addEventListener("click", () => {
    modal.remove();
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}




// create station modal
function showCreateStationModal() {
  openModal("Create Station", `
    <form id="create-station-form" class="dashboard-form">
      <div class="form-group">
        <label>Station Name</label>
        <input 
          type="text" 
          name="stationName" 
          placeholder="e.g. Hand Washing Procedure" 
          required
        />
        <label>Station Description</label>
        <input 
          type="text-area" 
          name="stationDescription"
          required
        />
      </div>

      <button class="form-submit-btn" type="submit">
        Save Station
      </button>
    </form>
  `);

  const form = document.querySelector('#create-station-form');
  form.addEventListener('submit', handleCreateStation)
}





// add user modal
function showAddUserModal() {
  openModal("Add User", `
    <form id="add-user-form" class="dashboard-form">

    <div class="form-group">
        <label>Role</label>
        <select name="role" class="role-selector">
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="student" selected >Student</option>
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Surname</label>
          <input type="text" name="surname" placeholder="e.g. Musa" required />
        </div>

        <div class="form-group">
          <label>Firstname</label>
          <input type="text" name="firstname" placeholder="e.g. Aisha" required />
        </div>
      </div>

      <div class="form-group admission-wrapper">
        <label>Admission No</label>
        <input type="text" name="admissionNo" placeholder="e.g. UMCONS/23A BM/020" 
        />
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Username</label>
          <input type="text" name="username" required />
        </div>

        <div class="form-group">
          <label>Password</label>
          <input type="password" name="password" required />
       </div>
      </div>

      <button class="form-submit-btn" type="submit">
        Add User
      </button>
    </form>
  `);


  const roleSelect = document.querySelector(".role-selector");
  const admissionWrapper = document.querySelector(".admission-wrapper");
 
  roleSelect.addEventListener("change", ()=>{

    admissionWrapper.style.display = roleSelect.value==="student"
    ? "block"
    : "none";

  });

  const form = document.querySelector("#add-user-form");
 
  form.addEventListener("submit", handleAddUser);

}




function handleCreateStation(e) {
  e.preventDefault();

  const formData = new FormData(e.target);

  const stationName = formData.get("stationName");
  const stationDescription = formData.get("stationDescription");

  const station = createStation(stationName, stationDescription);
  const saved = saveStation(station);

  if (saved) {
    const adminContent = document.querySelector('#admin-content');
    renderViewStations(adminContent);
    document.querySelector(".modal-overlay").remove();
  }
}




function renderStationPage(container, stationId) {

  const station = getStationById(stationId);
  
  container.innerHTML = '';

  const backBtn = document.createElement("button");
  backBtn.className = "back-btn";
  backBtn.textContent = "← Back";

  backBtn.addEventListener("click", () => {
    renderAdminDashboard(container);
  });

  const section = document.createElement('section');
  section.className = 'station-management-page';
  section.appendChild(backBtn);

  // station title
  const heading = document.createElement('h2');

  heading.textContent = station.name;

  section.appendChild(heading);

  // procedure box
  const procedureBox = document.createElement('div');
  procedureBox.className = 'station-box';

  procedureBox.innerHTML = `
    <h3>Procedure ${station.name}</h3>
    <p>${station.procedureItems.length} Procedure Items</p>

    <ul class="procedure-list">
      ${
        station.procedureItems
          .map((item) => `
            <li>
              ${item.description}
            </li>
          `)
          .join("")
      }
    </ul>

    <label class="timer-toggle">

    <input
      type="checkbox"
      class="procedure-timer-toggle"
      ${
        station.procedureTimer.enabled
          ? "checked"
          : ""
      }>
      Enable Procedure Timer
    </label>

    <div class="timer-input-wrapper" style="
      ${!station.procedureTimer.enabled
      ? "display:none"
      : ""}
     ">

      <input
        type="number"
        class="procedure-timer-input"
        placeholder="Minutes"

        value="${
          station.procedureTimer.duration || ""
        }">
        <button class="save-timer-btn">
          save
        </button>
    </div>

    <button class="add-procedure-btn">
      Add Procedure Item
    </button>
  `;

  const addProcedureBtn = procedureBox.querySelector(".add-procedure-btn");

  addProcedureBtn.addEventListener("click", () => {
    showProcedureModal(station.id, container);

  });
  
  const procedureToggle = procedureBox.querySelector(".procedure-timer-toggle");

  const procedureInput = procedureBox.querySelector(".procedure-timer-input");
  
  procedureToggle.addEventListener("change", () => {
      toggleProcedureTimer(station.id);

        if (!procedureToggle.checked) {
          setProcedureTimerDuration(station.id, 0)
        }
        renderStationPage(container, station.id);

      }
     
    );


  procedureInput.addEventListener("change", () => {

    const seconds = Number(procedureInput.value);
    console.log(seconds)

    setProcedureTimerDuration(station.id, seconds);

    }
  );


  // question box
  const questionBox = document.createElement('div');

  questionBox.className = 'station-box';

  questionBox.innerHTML = `
    <h3>Question ${station.name}</h3>
    <p>${station.questions.length} Questions</p>

    <ul class="question-list">

      ${
        station.questions
          .map((question) => `
            <li>

              <strong>
                ${question.description}
              </strong>

              <p>
                Answer:
                ${question.answer}
              </p>

              <span>
                ${question.mark} marks
              </span>

            </li>
          `)
          .join("")
      }

    </ul>

    <label class="timer-toggle">

    <input
      type="checkbox"
      class="question-timer-toggle"
      ${
        station.questionTimer.enabled
          ? "checked"
          : ""
      }>
      Enable Question Timer
    </label>

    <div class="timer-input-wrapper" style="
      ${!station.questionTimer.enabled
      ? "display:none"
      : ""}
     ">

      <input
        type="number"
        class="question-timer-input"
        placeholder="Minutes"

        value="${
          station.questionTimer.duration || ""
        }">

        <button class="save-timer-btn">
          save
        </button>
      </div>

    <button class="add-question-btn">
      Add Question
    </button>
  `;

  const addQuestionBtn = questionBox.querySelector(".add-question-btn");

  addQuestionBtn.addEventListener("click", () => {
    showQuestionModal(station.id, container)

  });


  const questionToggle = questionBox.querySelector(".question-timer-toggle");

  const questionInput = questionBox.querySelector(".question-timer-input");
  
  questionToggle.addEventListener("change", () => {
      toggleQuestionTimer(station.id);

        if (!questionToggle.checked) {
          setQuestionTimerDuration(station.id, 0)
        }
        renderStationPage(container, station.id);

      }
     
    );

  questionInput.addEventListener("change", () => {

    const seconds = Number(questionInput.value);
    console.log(seconds)
    console.log(station)

    setQuestionTimerDuration(station.id, seconds);
    
    }
  );

  const grid = document.createElement("div");
  grid.className = "station-grid";

  grid.appendChild(procedureBox);
  grid.appendChild(questionBox);
  section.appendChild(grid);


  const resultSection = document.createElement("section");
  resultSection.className = "station-result-section";
  resultSection.innerHTML = ` 
  
  <div class="result-header">
      <div> 
        <h2>
            Station Results
        </h2>

        <span class="result-arrow">
            ▼
        </span>
      </div>
       <button class="refresh-result-btn">
        ↻
      </button>
  </div>

  <div class="result-content">

      <div class="result-station-card">

          <table class="result-table">

              <thead>

                  <tr>

                      <th>Firstname</th>
                      <th>Lastname</th>
                      <th>Adm No</th>

                      <th>Proc Score</th>
                      <th>Proc %</th>

                      <th>Q Score</th>
                      <th>Q %</th>

                  </tr>

              </thead>

              <tbody>

                  <tr>

                      <td>Loading...</td>
                      <td>Loading...</td>
                      <td>Loading...</td>
                      <td>Loading...</td>
                      <td>Loading...</td>
                      <td>Loading...</td>
                      <td>Loading...</td>

                  </tr>

              </tbody>

          </table>

      </div>

  </div>
  `;
  section.appendChild(resultSection);
  
  const resultHeader = resultSection.querySelector(".result-header");

  const resultContent = resultSection.querySelector(".result-content");

  const arrow = resultSection.querySelector(".result-arrow");

  resultContent.style.display = "none";
  arrow.addEventListener("click", ()=>{

      const isHidden = resultContent.style.display === "none";

      resultContent.style.display = isHidden ? "block" : "none";

      arrow.textContent = isHidden ? "▲" : "▼";

  });


  container.appendChild(section);
}









function showProcedureModal(stationId, container) {

  const overlay = document.createElement("div");

  overlay.className = "modal-overlay";

  overlay.innerHTML = `
    <div class="modal">

      <div class="title">
        <h2>Add Procedure Item</h2>
        <button class="close-modal-btn" type="button">×</button>
      </div>
    
      <form id="procedure-form">

        <input
          type="text"
          name="description"
          placeholder="Procedure description"
          required
        >

        <input
          type="text"
          name="scoreOptions"
          placeholder="Mark"
          required
        >

        <button type="submit">
          Save Procedure
        </button>

      </form>

    </div>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector("#procedure-form");

  const closeModal = overlay.querySelector(".close-modal-btn");
  closeModal.addEventListener('click', (e) => {

    const event = e.target;

    if (event == closeModal) {

      overlay.remove();

    }
  })

  form.addEventListener("submit", (e) => {
    handleProcedureSubmit(e, stationId, container);

  });
}










function handleProcedureSubmit(e, stationId, container) {

  e.preventDefault();

  const formData = new FormData(e.target);

  const description = formData.get("description");

  const scoreOptions = formData.get("scoreOptions").split(",").map(Number);

  const station = getStationById(stationId);

  addProcedureToStation(station.name, description, scoreOptions);
  
  document.querySelector(".modal-overlay").remove();

  renderStationPage(container, stationId);
}




function showQuestionModal(stationId, container) {

  const overlay = document.createElement("div");

  overlay.className = "modal-overlay";

  overlay.innerHTML = `
    <div class="modal">

      <div class="title">
        <h2>Add Question</h2>
        <button class="close-modal-btn" type="button">×</button>
      </div>

      <form id="question-form">

        <textarea
          name="description"
          placeholder="Question"
          required
        ></textarea>

        <input
          type="text"
          name="option1"
          placeholder="Option 1"
          required
        >

        <input
          type="text"
          name="option2"
          placeholder="Option 2"
          required
        >

        <input
          type="text"
          name="option3"
          placeholder="Option 3"
          required
        >

        <input
          type="text"
          name="option4"
          placeholder="Option 4"
          required
        >

        <input
          type="text"
          name="answer"
          placeholder="Correct Answer"
          required
        >

        <input
          type="number"
          name="mark"
          placeholder="Mark"
          required
        >

        <button type="submit">
          Save Question
        </button>

      </form>

    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = overlay.querySelector(".close-modal-btn");
  closeModal.addEventListener('click', (e) => {

    const event = e.target;

    if (event == closeModal) {

      overlay.remove();

    }
  })

  const form = overlay.querySelector("#question-form");

  form.addEventListener("submit", (e) => {

    handleQuestionSubmit(
      e,
      stationId,
      container
    );

  });
}








function handleQuestionSubmit(
  e,
  stationId,
  container
) {

  e.preventDefault();

  const formData =
    new FormData(e.target);

  const description =
    formData.get("description");

  const options = [
    formData.get("option1"),
    formData.get("option2"),
    formData.get("option3"),
    formData.get("option4"),
  ];

  const answer =
    formData.get("answer");

  const mark =
    Number(formData.get("mark"));

  const station =
    getStationById(stationId);

  addQuestionToStation(
    station.name,
    description,
    options,
    answer,
    mark
  );

  document
    .querySelector(".modal-overlay")
    .remove();

  renderStationPage(container, stationId);
}



function handleAddUser(e){

    e.preventDefault();

    const formData = new FormData(e.target);
    const surname = formData.get("surname");
    const firstname = formData.get("firstname");
    const username = formData.get("username");
    const password = formData.get("password");
    const role = formData.get("role");
    const admissionNo = role === "student" ? formData.get("admissionNo")
    : null;


    const user = createUser(
        surname,
        firstname,
        username,
        password,
        role,
        admissionNo
    );


    const myUser = user;
    console.log(getUserById(myUser.id))

    alert("User created successfully");

    document.querySelector(".modal-overlay").remove();

}








function renderUsers(container){

    container.innerHTML = "";

    const section = document.createElement("section");
    section.className = "admin-page";


    const backBtn = document.createElement("button");

    backBtn.className = "back-btn";

    backBtn.textContent = "← Back";

    backBtn.addEventListener("click", ()=>{

        renderAdminDashboard(container);
    });


    container.appendChild(backBtn);
    

    const users = getAllUsers();

    section.innerHTML = `

    <h2>
        All Users
    </h2>

    <div class="result-station-card">

        <table class="result-table">

            <thead>

                <tr>
                    <th>S/N</th>

                    <th>Firstname</th>

                    <th>Lastname</th>

                    <th>Username</th>

                    <th>Role</th>

                    <th>Admission No</th>

                    <th>Actions</th>

                </tr>

            </thead>

            <tbody>

            </tbody>

        </table>

    </div>

    `;

    container.appendChild(section);

    const tbody = section.querySelector("tbody");


    if(users.length===0){

        tbody.innerHTML=`

        <tr>

            <td
            colspan="7"
            style="
            text-align:center
            "
            >

            No users found

            </td>

        </tr>

        `;

        return;
    }


    users.forEach((user, index) => {

        tbody.innerHTML += `

        <tr>

            <td>
            ${index + 1}
            </td>

            <td>
            ${user.firstname}
            </td>

            <td>
            ${user.surname}
            </td>

            <td>
            ${user.username}
            </td>

            <td>
            ${user.role}
            </td>

            <td>
            ${
                user.admissionNo
                ||
                "-"
            }
            </td>

            <td>

                <button
                class="edit-user-btn"
                data-user-id=
                "${user.id}"
                >

                Edit

                </button>

                <button
                class="delete-user-btn"
                data-user-id=
                "${user.id}"
                >

                Delete

                </button>

            </td>

        </tr>

        `;

    });

}