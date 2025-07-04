# Donut-Bot Website

A modern landing page for the Donut-Bot web crawler platform, showcasing its real technical capabilities and architecture.

## About Donut-Bot

Donut-Bot is a production-ready web crawler built with:
- **Backend**: FastAPI with async/await architecture
- **Frontend**: React + TypeScript dashboard
- **Database**: Redis for URL frontier, MongoDB for job storage
- **Key Features**: Bloom filter deduplication, robots.txt compliance, rate limiting

## Website Features

- **Animated Background**: Floating shapes and gradient animations
- **Interactive Donut-Bot**: Animated robot character with blinking eyes
- **Real Architecture Visualization**: Shows actual system components (FastAPI, Redis, MongoDB)
- **Technical Features Grid**: 12 real features based on actual implementation
- **Usage Examples**: Real API endpoints and curl commands
- **Responsive Design**: Mobile-friendly layout

## Tech Stack

- **React 19** - Latest React with new JSX transform
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first CSS framework
- **Font Awesome** - Icon library for UI elements
- **Vite** - Fast build tool and development server

## Components

### BackgroundAnimation
Renders the animated background with floating shapes and gradient effects.

### Navigation
Fixed navigation bar with Donut-Bot logo and links to actual pages (Dashboard, Jobs, API Docs).

### Hero
Main landing section with:
- Updated description reflecting real capabilities
- Accurate statistics (4K+ max pages, 3 max depth, Redis frontier)
- Interactive crawler visualization

### CrawlerVisualization
Interactive visualization showing actual system components:
- Animated Donut-Bot character
- Resource nodes (HTML, FastAPI, Redis, MongoDB)
- Output nodes (JSON, Metrics, Logs)
- Auto-playing animations

### Features
Grid of 12 real technical features:
- Redis-Based URL Frontier
- Bloom Filter Deduplication
- Robots.txt Compliance
- Rate Limiting
- Real-time Monitoring
- RESTful API
- Job Scheduling
- MongoDB Storage
- Async Architecture
- Configurable Settings
- Content Extraction
- React Dashboard

### Usage
New section showcasing:
- System architecture diagram
- Key capabilities with specific details
- Real API examples with curl commands
- Actual configuration options

## Real Donut-Bot Capabilities

Based on the actual backend and frontend implementation:

### Backend Features
- **Concurrent Crawling**: Configurable workers (default: 3)
- **URL Management**: Redis-based frontier with priority scheduling
- **Deduplication**: Bloom filter for memory-efficient URL tracking
- **Rate Limiting**: Per-domain configurable delays
- **Robots.txt**: Automatic parsing and compliance
- **Content Extraction**: BeautifulSoup-based HTML parsing
- **Metrics**: Real-time performance monitoring
- **Job Management**: MongoDB-based job storage and scheduling

### Frontend Features
- **Real-time Dashboard**: Live metrics and progress tracking
- **Job Management**: Start, stop, pause, resume crawler jobs
- **Domain Management**: Add/remove allowed domains
- **Configuration Panel**: Extensive crawler settings
- **Scheduler**: Cron-like job scheduling
- **Results Browser**: View crawled data and metadata

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Preview production build**:
   ```bash
   npm run preview
   ```

## Design System

The website uses a custom design system with CSS custom properties:

```css
:root {
  --primary: #FF6B6B;      /* Coral red */
  --secondary: #4ECDC4;    /* Turquoise */
  --accent: #FFE66D;       /* Yellow */
  --dark: #1A1A2E;         /* Dark blue */
  --darker: #0F0F1E;       /* Darker blue */
  --light: #F7F7F7;        /* Light gray */
  --glass: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
}
```

## Animations

The website includes various CSS animations:
- **Floating shapes** - Background decorative elements
- **Gradient shifts** - Text color animations
- **Slide-up effects** - Content entrance animations
- **Processing ring** - Loading animation
- **Output pop** - Node appearance effects
- **Hover effects** - Interactive element feedback

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- ES2020+ JavaScript features
- CSS custom properties (CSS variables)

## Development

The project uses:
- **ESLint** for code linting
- **TypeScript** for type checking
- **Vite** for fast HMR and building
- **Tailwind CSS** for styling

## Related Projects

- **Backend**: FastAPI-based crawler engine with Redis and MongoDB
- **Frontend Dashboard**: React-based monitoring and control interface
- **Docker Setup**: Complete containerized deployment

## License

This project is part of the Donut-Bot web crawler system.
