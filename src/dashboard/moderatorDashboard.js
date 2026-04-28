export function renderModeratorDashboard(container) {
  container.innerHTML = `
    <section class="dashboard moderator-dashboard">
      <div class="dashboard-header">
        <div>
          <h1>Moderator Dashboard</h1>
          <p>Select a station and search student admission number.</p>
        </div>

        <div class="profile-card">
          <strong>Moderator</strong>
          <p>Name: Examiner</p>
        </div>
      </div>

      <div class="station-area">
        <h2>Available Stations</h2>

        <div class="station-list">
          <button>Hand Washing</button>
          <button>Injection Procedure</button>
          <button>Vital Signs</button>
        </div>
      </div>

      <div class="search-area">
        <input 
          type="text" 
          placeholder="Search student by admission number"
        />
        <button>Search</button>
      </div>
    </section>
  `;
}