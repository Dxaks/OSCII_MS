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
    //   renderCreateStation(adminContent);
        showCreateStationModal();
    }

    if (page === "view-stations") {
      renderViewStations(adminContent);
    }

    if (page === "users") {
      renderUsers(adminContent);
    }

    if (page === "add-user") {
    //   renderAddUser(adminContent);
        showAddUserModal();
    }
  });
}


// view stations screen

function renderViewStations(container) {
  container.innerHTML = `
    <section class="admin-page">
      <h2>All Stations</h2>

      <div class="station-list">
        <article class="station-card">
          <div class="station-card-header">
            <h3>Hand Washing</h3>
          </div>

          <p class="station-description">
            Assess hand hygiene procedure.
          </p>

          <div class="station-stats">
            <div>
              <strong>3</strong>
              <span>Checklist Items</span>
            </div>

            <div>
              <strong>5</strong>
              <span>Questions</span>
            </div>
          </div>

          <div class="station-timers">
            <div class="timer">
                Checklist: 5 mins
            </div>

            <div class="timer">
                Questions: 10 mins
            </div>
        </div>

          <button class="enter-station-btn">
            Enter Station
          </button>
        </article>
      </div>
    </section>
  `;
}
// show users screen

function renderUsers(container) {
  container.innerHTML = `
    <section class="admin-page">
      <h2>Users</h2>
      <p>All registered users will appear here.</p>
    </section>
  `;
}


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
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Question Timer</label>
          <input type="number" name="questionDuration" placeholder="Seconds" />
        </div>

        <div class="form-group">
          <label>Checklist Timer</label>
          <input type="number" name="checklistDuration" placeholder="Seconds" />
        </div>
      </div>

      <button class="form-submit-btn" type="submit">
        Save Station
      </button>
    </form>
  `);
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