// Main JavaScript for index.html
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Initialize deal tracking functionality
    initDealTracking();

    // Initialize destination tracking
    initDestinationTracking();
});

// Function to initialize deal tracking
function initDealTracking() {
    const viewDealButtons = document.querySelectorAll('.deal-card .btn-outline');
    
    viewDealButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get deal information from parent card
            const dealCard = this.closest('.deal-card');
            const origin = dealCard.querySelector('.deal-origin').textContent;
            const destination = dealCard.querySelector('.deal-destination').textContent;
            const price = dealCard.querySelector('.deal-price-new').textContent;
            const airline = dealCard.querySelector('.deal-airline span').textContent;
            
            // In a real implementation, this would open a modal with deal details
            // or redirect to a booking page. For now, we'll just show an alert.
            alert(`Deal selected: ${origin} to ${destination} for ${price} with ${airline}`);
            
            // Track this interaction (would send to analytics in real implementation)
            console.log('Deal viewed:', {
                origin,
                destination,
                price,
                airline,
                timestamp: new Date().toISOString()
            });
        });
    });
}

// Function to initialize destination tracking
function initDestinationTracking() {
    const trackButtons = document.querySelectorAll('.destination-track');
    
    trackButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get destination information
            const destinationCard = this.closest('.destination-card');
            const destinationName = destinationCard.querySelector('h3').textContent;
            
            // Check if user is logged in (in a real implementation)
            const isLoggedIn = false; // Simulate not logged in
            const isPremiumUser = false; // Simulate not premium
            
            if (!isLoggedIn || !isPremiumUser) {
                // Redirect to preferences page with premium signup prompt
                window.location.href = 'preferences.html?action=track&destination=' + encodeURIComponent(destinationName);
            } else {
                // In a real implementation, this would add the destination to the user's tracking list
                alert(`${destinationName} added to your tracked destinations!`);
            }
        });
    });
}

// Testimonial carousel functionality would be added here in a real implementation
