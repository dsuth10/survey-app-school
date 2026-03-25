# Quickstart: HeroUI UI Redesign

## Installation

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install HeroUI and dependencies**:
   ```bash
   npm install @heroui/react framer-motion tailwindcss postcss autoprefixer
   ```

3. **Initialize Tailwind CSS**:
   ```bash
   npx tailwindcss init -p
   ```

## Configuration

### 1. Tailwind Configuration
Update `frontend/tailwind.config.js`:
```javascript
import {heroui} from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  darkMode: "class",
  plugins: [heroui()],
};
```

### 2. Provider Setup
Update `frontend/src/main.jsx`:
```jsx
import { HeroUIProvider } from "@heroui/react";
// ... other imports

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HeroUIProvider>
      <App />
    </HeroUIProvider>
  </React.StrictMode>
);
```

## Running the App
```bash
npm run dev
```
The app will be available on `http://localhost:3005`.
