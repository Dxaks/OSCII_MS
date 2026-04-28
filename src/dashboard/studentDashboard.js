export function renderStudentDashboard(container) {
  container.innerHTML = `
    <section class="dashboard student-dashboard">
      <h1>Student Dashboard</h1>

      <div class="student-info-card">
        <h2>Student Information</h2>
        <p>Name: Student Name</p>
        <p>Admission No: UMCONS/23A/BM/020</p>
      </div>

      <div class="available-test-card">
        <h2>Available Station</h2>
        <p>Station One: Hand Washing</p>

        <button>Start Test</button>
      </div>
    </section>
  `;
}