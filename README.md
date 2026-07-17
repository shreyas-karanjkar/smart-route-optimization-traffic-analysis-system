# 🚗 Smart Route Optimization & Traffic Analysis System

![Dashboard](assets/screenshots/dashboard.jpg)

An intelligent **Decision Support System (DSS)** built using **React.js**, **Node.js**, **Express.js**, and the **Google Maps Directions API** to analyze multiple travel routes and recommend the optimal route based on user-defined optimization priorities.

Unlike traditional navigation systems that simply display routes, this application performs **multi-criteria route analysis**, evaluates traffic conditions, computes weighted optimization scores, and provides explainable recommendations to support smarter travel decisions.

---

# ✨ Key Features

* 🌍 Real-time route analysis using Google Maps Directions API
* 🚗 Compare multiple transportation modes

  * Car
  * Bus
  * Motorbike
  * Walking
* 📊 Multi-criteria route optimization

  * Fastest Route
  * Least Traffic
  * Shortest Distance
* 📈 Weighted scoring algorithm for intelligent route ranking
* 🚦 Traffic delay estimation
* ✅ Route reliability assessment
* 💡 Explainable Decision Support System (DSS)
* 🗺️ Interactive route visualization
* 🌙 Modern responsive UI with Dark/Light theme
* ⚡ RESTful backend using Express.js

---

# 🧠 System Workflow

1. User enters the source and destination.
2. The backend retrieves multiple routes using the Google Maps Directions API.
3. Route metrics such as distance, travel time, and traffic information are extracted.
4. A weighted optimization algorithm evaluates every available route.
5. Each route is assigned a reliability score.
6. Routes are ranked according to the selected optimization priority.
7. The system recommends the best route and provides an explanation for the recommendation.

---

# 🛠️ Technology Stack

## Frontend

* React.js
* JavaScript (ES6+)
* Vite
* HTML5
* CSS3
* Axios
* Leaflet

## Backend

* Node.js
* Express.js
* REST API

## APIs

* Google Maps Directions API

---

# 📸 Application Screenshots

## 🏠 Smart Route Finder Dashboard

Interactive dashboard with map visualization, travel mode selection, optimization priorities, and route analysis.

![Dashboard](assets/screenshots/dashboard.jpg)

---

## 💡 Decision Support & Route Recommendation

Displays weighted route analysis, optimization scores, congestion analysis, and explainable route recommendations.

![Decision Support](assets/screenshots/decision-support.jpg)

---

## ⚙️ Optimization Priorities

Users can optimize routes based on different travel objectives.

* Fastest Route
* Least Traffic
* Shortest Distance

![Optimization Priority](assets/screenshots/optimization-priority.jpg)

---

## 🚗 Multi-Mode Transportation

Supports comparison across different transportation modes.

* Car
* Bus
* Motorbike
* Walking

![Travel Modes](assets/screenshots/travel-modes.jpg)

---

## 📊 Route Comparison Dashboard

Compare every available route using:

* Distance
* Estimated Time
* Traffic Delay
* Reliability
* Optimization Score

![Route Comparison](assets/screenshots/route-comparison.jpg)

---

# 📂 Project Structure

```text
smart-route-optimization-traffic-analysis-system
│
├── assets/
│   └── screenshots/
│
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
└── README.md
```

---

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/shreyas-karanjkar/smart-route-optimization-traffic-analysis-system.git
```

## Backend

```bash
cd backend
npm install
node server.js
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

---

# 🔑 Environment Variables

Create a `.env` file inside the **backend** directory.

```env
PORT=5000
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
```

---

# 🔮 Future Enhancements

* AI-powered adaptive route recommendation
* Historical traffic analytics
* Multi-stop route optimization
* User authentication
* Personalized travel preferences
* Saved routes and travel history
* Live weather integration
* Machine Learning based travel prediction

---

# 👨‍💻 Author

**Shreyas Karanjkar**

M.Tech Computer Science & Engineering (Full Stack Development)

VIT Vellore

---

⭐ If you found this project interesting, feel free to star the repository.
