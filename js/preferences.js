// JavaScript for preferences.html
document.addEventListener('DOMContentLoaded', function() {
    // Form step navigation
    initFormStepNavigation();
    
    // Initialize airport selection functionality
    initAirportSelection();
    
    // Initialize airline preference functionality
    initAirlinePreferences();
    
    // Initialize travel class selection
    initTravelClassSelection();
    
    // Initialize discount slider
    initDiscountSlider();
    
    // Handle form submission
    initFormSubmission();
    
    // Check URL parameters for destination tracking
    checkUrlParameters();
});

// Function to handle multi-step form navigation
function initFormStepNavigation() {
    const nextButtons = document.querySelectorAll('.next-step');
    const prevButtons = document.querySelectorAll('.prev-step');
    const progressSteps = document.querySelectorAll('.progress-step');
    const formSteps = document.querySelectorAll('.form-step');
    
    nextButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Get current step
            const currentStep = this.closest('.form-step');
            const currentStepNum = parseInt(currentStep.dataset.step);
            const nextStepNum = currentStepNum + 1;
            
            // Validate current step (in a real implementation)
            if (!validateStep(currentStepNum)) {
                return;
            }
            
            // Hide current step
            currentStep.classList.add('hidden');
            
            // Show next step
            const nextStep = document.querySelector(`.form-step[data-step="${nextStepNum}"]`);
            if (nextStep) {
                nextStep.classList.remove('hidden');
                
                // Update progress indicator
                progressSteps.forEach(step => {
                    if (parseInt(step.dataset.step) === nextStepNum) {
                        step.classList.add('active');
                    }
                });
            }
        });
    });
    
    prevButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Get current step
            const currentStep = this.closest('.form-step');
            const currentStepNum = parseInt(currentStep.dataset.step);
            const prevStepNum = currentStepNum - 1;
            
            // Hide current step
            currentStep.classList.add('hidden');
            
            // Show previous step
            const prevStep = document.querySelector(`.form-step[data-step="${prevStepNum}"]`);
            if (prevStep) {
                prevStep.classList.remove('hidden');
                
                // Update progress indicator
                progressSteps.forEach(step => {
                    if (parseInt(step.dataset.step) === currentStepNum) {
                        step.classList.remove('active');
                    }
                });
            }
        });
    });
}

// Function to validate each step (would be more comprehensive in real implementation)
function validateStep(stepNumber) {
    switch(stepNumber) {
        case 1:
            // Validate account information
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            if (!email || !password || !confirmPassword) {
                alert('Please fill in all required fields');
                return false;
            }
            
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return false;
            }
            
            if (password.length < 8) {
                alert('Password must be at least 8 characters long');
                return false;
            }
            
            return true;
            
        case 2:
            // Validate airport selection (optional in this implementation)
            return true;
            
        case 3:
            // Validate airline preferences (optional in this implementation)
            return true;
            
        case 4:
            // Validate travel class selection (optional in this implementation)
            return true;
            
        default:
            return true;
    }
}

// Function to initialize airport selection functionality
function initAirportSelection() {
    // Handle destination preference radio buttons
    const destinationPreference = document.querySelectorAll('input[name="destination_preference"]');
    const specificDestinations = document.querySelector('.specific-destinations');
    
    destinationPreference.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'specific') {
                specificDestinations.classList.remove('hidden');
            } else {
                specificDestinations.classList.add('hidden');
            }
        });
    });
    
    // Airport search functionality (simplified implementation)
    const originSearch = document.getElementById('origin-search');
    if (originSearch) {
        originSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const airportItems = document.querySelectorAll('.airport-item');
            
            airportItems.forEach(item => {
                const airportName = item.querySelector('.airport-name').textContent.toLowerCase();
                const airportCode = item.querySelector('.airport-code').textContent.toLowerCase();
                
                if (airportName.includes(searchTerm) || airportCode.includes(searchTerm)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
    
    // Destination search functionality (simplified implementation)
    const destinationSearch = document.getElementById('destination-search');
    if (destinationSearch) {
        destinationSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const destinationItems = document.querySelectorAll('.destination-item');
            
            destinationItems.forEach(item => {
                const destinationName = item.querySelector('span').textContent.toLowerCase();
                
                if (destinationName.includes(searchTerm)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
}

// Function to initialize airline preference functionality
function initAirlinePreferences() {
    // Handle airline preference radio buttons
    const airlinePreference = document.querySelectorAll('input[name="airline_preference"]');
    const specificAirlines = document.querySelector('.specific-airlines');
    
    airlinePreference.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'specific' || this.value === 'exclude') {
                specificAirlines.classList.remove('hidden');
            } else {
                specificAirlines.classList.add('hidden');
            }
        });
    });
    
    // Airline search functionality (simplified implementation)
    const airlineSearch = document.getElementById('airline-search');
    if (airlineSearch) {
        airlineSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const airlineItems = document.querySelectorAll('.airline-item');
            
            airlineItems.forEach(item => {
                const airlineName = item.querySelector('span').textContent.toLowerCase();
                
                if (airlineName.includes(searchTerm)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
}

// Function to initialize travel class selection
function initTravelClassSelection() {
    const travelClassRadios = document.querySelectorAll('input[name="travel_class"]');
    const premiumClassOptions = document.querySelector('.premium-class-options');
    
    travelClassRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'premium') {
                // Check if user has selected Premium+ plan
                const premiumPlusRadio = document.getElementById('plan-premium-plus');
                
                if (!premiumPlusRadio.checked) {
                    // Auto-select Premium+ plan
                    premiumPlusRadio.checked = true;
                    alert('Premium cabin deals require a Premium+ subscription. We\'ve selected that plan for you.');
                    
                    // Navigate to plan selection step
                    const planStep = document.querySelector('.progress-step[data-step="5"]');
                    planStep.click();
                }
            }
        });
    });
}

// Function to initialize discount slider
function initDiscountSlider() {
    const discountSlider = document.getElementById('min-discount');
    const discountValue = document.getElementById('discount-value');
    
    if (discountSlider && discountValue) {
        discountSlider.addEventListener('input', function() {
            discountValue.textContent = this.value + '%';
        });
    }
}

// Function to handle form submission
function initFormSubmission() {
    const form = document.getElementById('preferences-form');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // In a real implementation, this would submit the form data to the server
            // For now, we'll just show a success message
            
            // Get selected plan
            const selectedPlan = document.querySelector('input[name="subscription_plan"]:checked').value;
            let planName = 'Free';
            
            if (selectedPlan === 'premium') {
                planName = 'Premium';
            } else if (selectedPlan === 'premium_plus') {
                planName = 'Premium+';
            }
            
            // Simulate form submission
            alert(`Thank you for signing up for the ${planName} plan! In a real implementation, you would now be redirected to complete your subscription.`);
            
            // Redirect to home page
            window.location.href = 'index.html';
        });
    }
}

// Function to check URL parameters for destination tracking
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const destination = urlParams.get('destination');
    
    if (action === 'track' && destination) {
        // Auto-select Premium plan
        const premiumPlan = document.getElementById('plan-premium');
        if (premiumPlan) {
            premiumPlan.checked = true;
        }
        
        // Show a message about tracking the destination
        const trackingMessage = document.createElement('div');
        trackingMessage.className = 'tracking-message';
        trackingMessage.innerHTML = `
            <div class="alert alert-info">
                <p><strong>Want to track deals to ${destination}?</strong></p>
                <p>Sign up for a Premium subscription to track specific destinations and get personalized deal alerts.</p>
            </div>
        `;
        
        const formContainer = document.querySelector('.form-container');
        formContainer.insertBefore(trackingMessage, formContainer.firstChild);
    }
}
