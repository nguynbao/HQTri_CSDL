import "./App.css";
import Header from "./components/pages/header";
import HomePage from "./components/pages/home";
import ShowTime from "./components/pages/showtimes";
import SeatPage from "./components/pages/seats_page";
import Result from "./components/pages/result_page";
import Deadlock from "./routes/deadlock";
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<ShowTime />} />
          <Route path="/seats" element={<SeatPage />} />
          <Route path="/result" element={<Result />} />
          <Route path="/deadlock" element={<Deadlock />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
