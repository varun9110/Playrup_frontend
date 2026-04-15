import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './lib/axiosConfig'

createRoot(document.getElementById("root")!).render(<App />);
