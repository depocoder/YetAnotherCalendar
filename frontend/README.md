# 🌐 YetAnotherCalendar Frontend

[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=flat&logo=javascript&logoColor=%23F7DF1E)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![SCSS](https://img.shields.io/badge/SCSS-hotpink.svg?style=flat&logo=SASS&logoColor=white)](https://sass-lang.com/)
[![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)

## 📝 Overview

Modern, responsive React frontend for YetAnotherCalendar with **MAJOR BETA** mobile support. Provides a unified interface for managing educational events from multiple platforms (Modeus, LMS, Netology) with enhanced mobile-first design and advanced calendar features.

## ✨ Features

### 📱 **Mobile-First Design (BETA)**
- **Responsive Calendar View**: Touch-optimized mobile calendar with swipe navigation
- **Simple Date Picker**: Mobile-optimized date selection with Russian localization
- **Touch Interactions**: Native mobile gestures for better user experience
- **Responsive Breakpoints**: Seamless adaptation from mobile to desktop
- **Mobile Controls**: Dedicated mobile button layout for export and cache management

### 🗓️ **Advanced Calendar System**
- **Multi-Platform Events**: Unified display of Modeus, LMS, and Netology events
- **Enhanced Date Picker**: Flatpickr integration with custom Russian formatting
- **Week Navigation**: Intuitive week-by-week calendar browsing
- **Event Modals**: Rich event details with source attribution and quick actions
- **Timezone Support**: Automatic timezone detection and conversion

### 📤 **Export & Sharing**
- **ICS Export**: Standard calendar format compatible with:
  - Google Calendar
  - Apple Calendar  
  - Outlook
  - Thunderbird
  - Any RFC 5545 compliant calendar app
- **Custom Tooltips**: Contextual help explaining features and compatibility

### ⚡ **Performance & Caching**
- **Smart Cache Management**: Visual cache status indicators
- **Manual Refresh**: User-controlled cache updates with loading states
- **Optimized Rendering**: Efficient React component updates
- **Toast Notifications**: User-friendly success/error messages

### 🎨 **User Interface**
- **Material Design**: Clean, modern interface following Material Design principles
- **Enhanced Styling**: Improved visual hierarchy and component styling
- **Source Attribution**: Clear labeling of event sources (ТюмГУ/Modeus, Netology, LMS)
- **Accessibility**: Keyboard navigation and screen reader support

## 🏗️ Architecture

### Frontend Stack
- **⚛️ React 18**: Modern React with hooks and functional components
- **🎨 SCSS**: Advanced CSS preprocessing with variables and mixins
- **📅 Flatpickr**: Customizable date picker with internationalization
- **🍞 React Toastify**: Toast notification system
- **📱 Responsive Design**: Mobile-first CSS Grid and Flexbox layouts

### Component Structure
```
src/
├── components/
│   ├── Calendar/
│   │   ├── MobileCalendarView.jsx      # 📱 Mobile calendar interface
│   │   ├── SimpleDatePicker.jsx        # 📱 Mobile date picker
│   │   ├── DataPicker.jsx              # 🖥️ Desktop date picker
│   │   ├── EventModal.jsx              # 📋 Event details modal
│   │   ├── EventsDetail.jsx            # 📄 Event information display
│   │   ├── CacheUpdateBtn.jsx          # 🔄 Cache management
│   │   ├── ICSExporter.jsx             # 📤 Calendar export
│   │   └── LessonTimes.jsx             # ⏰ Time display utilities
│   ├── Header/                         # 🧭 Navigation components
│   └── FeaturesModal.jsx               # ℹ️ Feature information
├── pages/
│   ├── CalendarPage.jsx                # 📅 Main calendar interface  
│   ├── AboutPage.jsx                   # ℹ️ About page with GitHub integration
│   └── LoginPage.jsx                   # 🔐 Authentication interface
├── services/
│   └── api.js                          # 🌐 API communication layer
├── style/                              # 🎨 SCSS stylesheets
│   ├── calendar.scss                   # 📅 Calendar styling
│   ├── SimpleDatePicker.scss           # 📱 Mobile date picker styles
│   ├── about.scss                      # ℹ️ About page styles
│   └── header.scss                     # 🧭 Header navigation styles
└── utils/                              # 🛠️ Utility functions
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Backend API running on port 8000

### Installation

1. **Clone and navigate to frontend:**
   ```bash
   git clone https://github.com/depocoder/YetAnotherCalendar.git
   cd YetAnotherCalendar/frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.dist .env
   # Edit .env with your API endpoint configuration
   ```

4. **Start development server:**
   ```bash
   npm start
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
```
Creates optimized production build in the `build/` folder.

## 📱 Mobile Features (BETA)

### MobileCalendarView
- **Event Processing**: Intelligent grouping of events by day of week
- **Timezone Handling**: Automatic local timezone conversion
- **Touch Navigation**: Swipe gestures for week navigation
- **Responsive Layout**: Adaptive grid system for different screen sizes

### SimpleDatePicker
- **Russian Localization**: Full month names in Russian
- **Week Calculation**: Intelligent Monday-Sunday week boundaries
- **Custom Formatting**: Human-readable date ranges (e.g., "1 января – 7 января")
- **Mobile Optimization**: Touch-friendly buttons and spacing

## 🎨 Styling System

### SCSS Architecture
- **Variables**: Centralized color palette and spacing system
- **Mixins**: Reusable styling patterns for components
- **Responsive Design**: Mobile-first breakpoints and fluid layouts
- **Component Scoping**: Modular CSS for maintainable styling

### Design System
- **Colors**: Material Design inspired color palette
- **Typography**: Roboto font family with responsive sizing
- **Spacing**: Consistent 8px grid system
- **Shadows**: Subtle elevation effects for depth

## 🔧 Configuration

### Environment Variables
```bash
REACT_APP_API_URL=http://localhost:8000/api    # Backend API endpoint
REACT_APP_VERSION=$npm_package_version         # App version display
```

### Browser Support
- Chrome 70+
- Firefox 70+  
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari 12+, Chrome Mobile 70+)

## 🧪 Testing

```bash
npm test                    # Run test suite
npm run test:coverage       # Run tests with coverage report
```

## 📈 Performance

### Optimization Features
- **Code Splitting**: Lazy loading of route components
- **Bundle Optimization**: Webpack tree shaking and minification
- **Image Optimization**: Responsive images and lazy loading
- **Caching Strategy**: Service worker for offline functionality

### Performance Metrics
- **Lighthouse Score**: 90+ for Performance, Accessibility, Best Practices
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Mobile Performance**: Optimized for 3G networks

## 🤝 Contributing

1. Follow the existing component structure and naming conventions
2. Use functional components with React hooks
3. Implement responsive design for all new components  
4. Add proper TypeScript-style JSDoc comments
5. Test mobile functionality on real devices when possible

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](../LICENSE) file for details.