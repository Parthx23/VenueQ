# 🏟️ VenueQ: Smart Stadium Operations Platform

![VenueQ Mission Control](/public/hero-banner.png)

**Bringing Command & Control to the Next Generation of Live Events.**

VenueQ is a high-fidelity, real-time stadium operations platform designed to bridge the gap between fan experience and operational efficiency. Built for the high-pressure environment of championship-level events, VenueQ provides a unified "Mission Control" for venue managers and a seamless, data-driven companion for fans.

---

## 🚀 The Vision
Stadiums today suffer from "Information Silos." Fans don't know where the shortest lines are, and operators struggle to dispatch staff to surging areas in real-time. **VenueQ solves this** by creating a two-way synchronization layer between the crowd and the command center.

## ✨ Key Features

### 🎧 For the Fans (Attendee App)
*   **Smart Suggestions**: Real-time recommendations for the fastest food lines and nearest restrooms based on live occupancy.
*   **Interactive Wayfinding**: A high-fidelity venue map with dynamic crowd heatmaps and routing.
*   **Live Alert System**: Instant safety and event updates pushed directly to the device.
*   **Cinematic Experience**: A premium, immersive interface designed to match the energy of the big game.

### 🎮 For the Operators (Admin Mission Control)
*   **Live Queue Management**: Monitor wait times across the entire venue. One-click "Override" capabilities to account for manual observations.
*   **Crowd Flow Analytics**: Zone-by-zone density tracking to identify bottlenecks before they become incidents.
*   **Incident Command**: A broadcast center for issuing venue-wide alerts with varying severity levels.
*   **Performance Tracking**: Live KPIs for average wait times, headcount distribution, and staff availability.

---

## 🛠️ The Tech Stack

### Frontend
- **React + Vite**: For a ultra-fast, modern development experience.
- **Tailwind CSS**: Custom design system with glassmorphism and high-contrast accessibility.
- **Leaflet.js**: Custom geospatial engine for interactive stadium mapping.
- **Lucide / Material Symbols**: Modern icon system for operational clarity.

### Backend & Simulation
- **Node.js / Express**: Robust REST handling and real-time middleware.
- **WebSockets (Socket.io)**: powering the instant "Pulse" of the stadium.
- **Event-Driven Simulator**: A custom engine that models fan behavior, halftime surges, and staff workflows for realistic testing.

---

## 🏃 Getting Started

### 1. Project Initialization
```bash
# Clone the repository
git clone <your-repo-url>
cd venueq

# Install dependencies
npm install
```

### 2. Start the Mission Control Engine (Backend)
```bash
node server/index.js
```

### 3. Launch the Experience (Frontend)
```bash
npm run dev
```

---

## 🎨 Design Philosophy
VenueQ follows a **"Dark Mode First"** aesthetic, utilizing deep slate backgrounds (`#0a1012`) and vibrant primary accents (`#01696f`). The interface uses **Glassmorphism** layers to maintain depth and hierarchy, ensuring that mission-critical data always pops against the cinematic stadium backgrounds.

---

## 🛡️ Hackathon Submission
*   **Challenge**: Optimization of Crowd Flow & Fan Engagement.
*   **Impact**: Redefines how massive public spaces are managed through real-time telemetry and citizen-level reporting.
*   **Team**: Developed with Antigravity.

---

*“VenueQ — Operations at the speed of the game.”*
