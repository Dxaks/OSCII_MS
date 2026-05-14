import { saveStation, createStation, getAllStations, getStationById, addProcedureToStation, addQuestionToStation } from "../app/stationManager.js";




export function renderAdminDashboard(container) {
  container.innerHTML = `
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
      renderUsers(adminContent);
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
          row="5" 
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

      <div class="form-group">
        <label>Username / Admission No</label>
        <input 
          type="text" 
          name="username" 
          placeholder="e.g. UMCONS/23A/BM/020" 
          required 
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Password</label>
          <input type="password" name="password" required />
        </div>

        <div class="form-group">
          <label>Role</label>
          <select name="role">
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="student">Student</option>
          </select>
        </div>
      </div>

      <button class="form-submit-btn" type="submit">
        Add User
      </button>
    </form>
  `);
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

    <button class="add-procedure-btn">
      Add Procedure Item
    </button>
  `;

  const addProcedureBtn = procedureBox.querySelector("button");

  addProcedureBtn.addEventListener("click", () => {
    showProcedureModal(station.id, container);

  });



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

    <button class="add-question-btn">
      Add Question
    </button>
  `;

  const addQuestionBtn = questionBox.querySelector("button");

  addQuestionBtn.addEventListener("click", () => {
    showQuestionModal(station.id, container)

  });

  const grid = document.createElement("div");
  grid.className = "station-grid";

  grid.appendChild(procedureBox);
  grid.appendChild(questionBox);
  section.appendChild(grid);

  container.appendChild(section);
}














function showProcedureModal(stationId, container) {

  const overlay = document.createElement("div");

  overlay.className = "modal-overlay";

  overlay.innerHTML = `
    <div class="modal">

      <h2>Add Procedure Item</h2>

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

      <h2>Add Question</h2>

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

  const form =
    overlay.querySelector("#question-form");

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