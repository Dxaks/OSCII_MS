export function renderHomePage(container) {

    container.innerHTML = `
      <div class="home-page">
        <div>
          <h1>WELCOME TO UMCONS CLINICAL ASSESSMENT TEST</h1>
          <p>
            <button class="home-page-btn" data-tab="admin-tab">Adimn Dashboard</button>
            <button class="home-page-btn data-tab="menu-tab">Main Menu</button>
          </p>
        </div>

        <div class="image">
          
        </div>
        
      </div>
   `
}