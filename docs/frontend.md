# Flight Deals SaaS - Frontend Documentation

This documentation provides an overview of the frontend code structure for the Flight Deals Newsletter SaaS application. The frontend is built with HTML, CSS, and JavaScript, designed to be easily deployable to any web hosting service.

## File Structure

```
flight_deals_export/
├── index.html              # Main landing page
├── preferences.html        # User preferences and signup page
├── css/
│   └── styles.css          # Main stylesheet
├── js/
│   ├── main.js             # JavaScript for index.html
│   └── preferences.js      # JavaScript for preferences.html
├── images/                 # Directory for all images
│   ├── airlines/           # Airline logos
│   ├── destinations/       # Destination images
│   └── icons/              # UI icons
└── docs/                   # Documentation
    ├── frontend.md         # Frontend documentation (this file)
    └── backend.md          # Backend implementation guide
```

## Pages Overview

### Landing Page (index.html)

The landing page serves as the main entry point for users, showcasing:

- Hero section with call-to-action
- Featured flight deals with discount indicators
- Popular destinations with tracking options
- How the service works
- Pricing plans (Free, Premium, Premium+)
- Testimonials from users
- Footer with navigation links

### Preferences Page (preferences.html)

The preferences page handles user registration, subscription selection, and preference settings:

1. **Account Creation**: Email and password setup
2. **Airport Selection**: Origin airports and destination preferences
3. **Airline Preferences**: Options to include/exclude specific airlines
4. **Travel Class Selection**: "Fly for Cheap" (economy) or "Fly in Style" (premium cabins)
5. **Plan Selection**: Subscription tier selection with pricing

## Key Features

### Airport Selection Interface

- Visual airport badges with airline indicators
- Search functionality for finding specific airports
- Categorized display (domestic/international)
- Origin airport multi-selection

### Airline Preferences

- Three modes: All Airlines, Specific Airlines, Exclude Airlines
- Visual selection with airline logos
- Search functionality for finding specific airlines
- Categorized display (domestic/international)

### Travel Class Options

- "Fly for Cheap" option for economy class deals
- "Fly in Style" option for premium cabin deals (Premium+)
- Detailed selection of premium cabin types

### Deal Quality Preferences

- Minimum discount threshold slider (20-50%)
- Visual indicators for deal quality categories:
  - Good: 20-30% off
  - Great: 31-50% off
  - Amazing: 51%+ off

### Responsive Design

The interface is fully responsive, providing an optimal experience across:
- Desktop computers
- Tablets
- Mobile phones

## JavaScript Functionality

### Main.js (Landing Page)

- Smooth scrolling for navigation
- Deal tracking functionality
- Destination tracking with premium upsell
- Testimonial carousel

### Preferences.js (Preferences Page)

- Multi-step form navigation
- Form validation
- Airport and airline search filtering
- Travel class selection with premium plan enforcement
- Discount threshold slider
- Form submission handling
- URL parameter processing for destination tracking

## CSS Structure

The stylesheet follows a component-based approach with sections for:

- Base styles and typography
- Navigation components
- Hero section
- Deal cards
- Destination cards
- How it works section
- Pricing cards
- Testimonials
- Footer
- Preferences form components
- Responsive design rules

## Deployment Instructions

To deploy this frontend to your own domain:

1. Upload all files to your web hosting service, maintaining the directory structure
2. Ensure the web server is configured to serve index.html as the default page
3. Test all functionality after deployment

## Backend Integration Points

The frontend is designed to integrate with a backend API for the following functionality:

- User authentication and registration
- Subscription management
- Flight deal retrieval and filtering
- User preference storage
- Destination tracking
- Email notification management

See the backend documentation for implementation details on these integration points.
