// Admin Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Navigation between sections
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.admin-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links and sections
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Show corresponding section
            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
        });
    });
    
    // Deal Modal Functionality
    const addDealBtn = document.getElementById('add-deal-btn');
    const dealModal = document.getElementById('deal-modal');
    const closeModal = dealModal.querySelector('.close');
    const cancelDeal = document.getElementById('cancel-deal');
    const dealForm = document.getElementById('deal-form');
    
    addDealBtn.addEventListener('click', function() {
        dealModal.style.display = 'block';
        // Reset form
        dealForm.reset();
    });
    
    closeModal.addEventListener('click', function() {
        dealModal.style.display = 'none';
    });
    
    cancelDeal.addEventListener('click', function() {
        dealModal.style.display = 'none';
    });
    
    dealForm.addEventListener('submit', function(e) {
        e.preventDefault();
        // Here you would normally send the form data to the server
        // For demo purposes, we'll just close the modal and show a success message
        alert('Deal saved successfully!');
        dealModal.style.display = 'none';
    });
    
    // User Modal Functionality
    const addUserBtn = document.getElementById('add-user-btn');
    const userModal = document.getElementById('user-modal');
    const closeUserModal = userModal.querySelector('.close');
    const cancelUser = document.getElementById('cancel-user');
    const userForm = document.getElementById('user-form');
    
    addUserBtn.addEventListener('click', function() {
        userModal.style.display = 'block';
        // Reset form
        userForm.reset();
    });
    
    closeUserModal.addEventListener('click', function() {
        userModal.style.display = 'none';
    });
    
    cancelUser.addEventListener('click', function() {
        userModal.style.display = 'none';
    });
    
    userForm.addEventListener('submit', function(e) {
        e.preventDefault();
        // Here you would normally send the form data to the server
        // For demo purposes, we'll just close the modal and show a success message
        alert('User saved successfully!');
        userModal.style.display = 'none';
    });
    
    // Content Page Navigation
    const contentPages = document.querySelectorAll('.content-nav li');
    const contentEditArea = document.querySelector('.content-edit-area');
    
    contentPages.forEach(page => {
        page.addEventListener('click', function() {
            // Remove active class from all pages
            contentPages.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked page
            this.classList.add('active');
            
            // Update edit area title
            const pageName = this.textContent;
            contentEditArea.querySelector('h3').textContent = `Edit ${pageName}`;
            
            // In a real application, you would load the content for the selected page here
            // For demo purposes, we'll just show a message
            console.log(`Loading content for ${pageName}`);
        });
    });
    
    // Run Scraper Button
    const runScraperBtn = document.getElementById('run-scraper-btn');
    
    runScraperBtn.addEventListener('click', function() {
        // In a real application, this would trigger the scraper to run
        // For demo purposes, we'll just show a message
        alert('Scraper started! This may take a few minutes.');
        runScraperBtn.disabled = true;
        runScraperBtn.textContent = 'Scraper Running...';
        
        // Simulate scraper completion after 3 seconds
        setTimeout(function() {
            alert('Scraper completed! 5 new deals found.');
            runScraperBtn.disabled = false;
            runScraperBtn.textContent = 'Run Scraper';
        }, 3000);
    });
    
    // Deal Search Functionality
    const dealSearch = document.getElementById('deal-search');
    
    dealSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const dealRows = document.querySelectorAll('#deals tbody tr');
        
        dealRows.forEach(row => {
            const origin = row.cells[1].textContent.toLowerCase();
            const destination = row.cells[2].textContent.toLowerCase();
            const airline = row.cells[5].textContent.toLowerCase();
            
            if (origin.includes(searchTerm) || destination.includes(searchTerm) || airline.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
    
    // User Search Functionality
    const userSearch = document.getElementById('user-search');
    
    userSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const userRows = document.querySelectorAll('#users tbody tr');
        
        userRows.forEach(row => {
            const name = row.cells[1].textContent.toLowerCase();
            const email = row.cells[2].textContent.toLowerCase();
            const subscription = row.cells[3].textContent.toLowerCase();
            
            if (name.includes(searchTerm) || email.includes(searchTerm) || subscription.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
    
    // Edit Deal Buttons
    const editDealBtns = document.querySelectorAll('#deals .btn-secondary');
    
    editDealBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            const id = row.cells[0].textContent;
            const origin = row.cells[1].textContent;
            const destination = row.cells[2].textContent;
            const price = row.cells[3].textContent.replace('$', '');
            const airline = row.cells[5].textContent;
            
            // Populate form with deal data
            document.getElementById('origin').value = origin;
            document.getElementById('destination').value = destination;
            document.getElementById('price').value = price;
            
            // Set a default original price (20% higher than current price)
            const originalPrice = (parseFloat(price) * 1.2).toFixed(2);
            document.getElementById('original-price').value = originalPrice;
            
            // Try to select the airline in the dropdown
            const airlineSelect = document.getElementById('airline');
            for (let i = 0; i < airlineSelect.options.length; i++) {
                if (airlineSelect.options[i].text === airline) {
                    airlineSelect.selectedIndex = i;
                    break;
                }
            }
            
            // Set dates (for demo purposes, we'll use current date + offsets)
            const today = new Date();
            const departureDate = new Date(today);
            departureDate.setDate(today.getDate() + 30);
            document.getElementById('departure-date').valueAsDate = departureDate;
            
            const returnDate = new Date(today);
            returnDate.setDate(today.getDate() + 37);
            document.getElementById('return-date').valueAsDate = returnDate;
            
            const expiryDate = new Date(today);
            expiryDate.setDate(today.getDate() + 7);
            document.getElementById('expiry-date').valueAsDate = expiryDate;
            
            // Check featured checkbox based on current state
            const featured = row.cells[7].querySelector('input').checked;
            document.getElementById('featured').checked = featured;
            
            // Show the modal
            dealModal.style.display = 'block';
        });
    });
    
    // Edit User Buttons
    const editUserBtns = document.querySelectorAll('#users .btn-secondary');
    
    editUserBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            const fullName = row.cells[1].textContent;
            const email = row.cells[2].textContent;
            const subscription = row.cells[3].textContent.toLowerCase();
            const status = row.cells[4].textContent.toLowerCase();
            
            // Split full name into first and last name
            const nameParts = fullName.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');
            
            // Populate form with user data
            document.getElementById('first-name').value = firstName;
            document.getElementById('last-name').value = lastName;
            document.getElementById('email').value = email;
            
            // Set subscription
            const subscriptionSelect = document.getElementById('subscription');
            if (subscription === 'premium') {
                subscriptionSelect.value = 'premium';
            } else if (subscription === 'premium+') {
                subscriptionSelect.value = 'premium_plus';
            } else {
                subscriptionSelect.value = 'free';
            }
            
            // Set status
            document.getElementById('status').value = status;
            
            // Show the modal
            userModal.style.display = 'block';
        });
    });
    
    // Delete Deal Buttons
    const deleteDealBtns = document.querySelectorAll('#deals .btn-danger');
    
    deleteDealBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            const id = row.cells[0].textContent;
            const origin = row.cells[1].textContent;
            const destination = row.cells[2].textContent;
            
            if (confirm(`Are you sure you want to delete the deal from ${origin} to ${destination}?`)) {
                // In a real application, you would send a request to delete the deal
                // For demo purposes, we'll just remove the row from the table
                row.remove();
                alert('Deal deleted successfully!');
            }
        });
    });
    
    // Delete User Buttons
    const deleteUserBtns = document.querySelectorAll('#users .btn-danger');
    
    deleteUserBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            const name = row.cells[1].textContent;
            const email = row.cells[2].textContent;
            
            if (confirm(`Are you sure you want to delete the user ${name} (${email})?`)) {
                // In a real application, you would send a request to delete the user
                // For demo purposes, we'll just remove the row from the table
                row.remove();
                alert('User deleted successfully!');
            }
        });
    });
    
    // Add Page Button
    const addPageBtn = document.getElementById('add-page-btn');
    
    addPageBtn.addEventListener('click', function() {
        const pageName = prompt('Enter the name of the new page:');
        
        if (pageName) {
            // In a real application, you would create a new page in the database
            // For demo purposes, we'll just add it to the list
            const pagesList = document.querySelector('.content-nav ul');
            const newPage = document.createElement('li');
            newPage.textContent = pageName;
            newPage.setAttribute('data-page', pageName.toLowerCase().replace(/\s+/g, '-'));
            pagesList.appendChild(newPage);
            
            // Add click event listener to the new page
            newPage.addEventListener('click', function() {
                contentPages.forEach(p => p.classList.remove('active'));
                this.classList.add('active');
                contentEditArea.querySelector('h3').textContent = `Edit ${pageName}`;
            });
            
            alert(`Page "${pageName}" created successfully!`);
        }
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === dealModal) {
            dealModal.style.display = 'none';
        }
        if (e.target === userModal) {
            userModal.style.display = 'none';
        }
    });
    
    // Settings Save Button
    const saveSettingsBtn = document.querySelector('.settings-actions .btn-primary');
    
    saveSettingsBtn.addEventListener('click', function() {
        // In a real application, you would save all settings to the server
        // For demo purposes, we'll just show a success message
        alert('Settings saved successfully!');
    });
    
    // Content Save Button
    const saveContentBtn = document.querySelector('.content-edit-area .btn-primary');
    
    saveContentBtn.addEventListener('click', function() {
        // In a real application, you would save the content to the server
        // For demo purposes, we'll just show a success message
        alert('Content saved successfully!');
    });
    
    // Content Preview Button
    const previewContentBtn = document.querySelector('.content-edit-area .btn-secondary');
    
    previewContentBtn.addEventListener('click', function() {
        // In a real application, you would open a preview of the page
        // For demo purposes, we'll just open the homepage in a new tab
        window.open('index.html', '_blank');
    });
});
