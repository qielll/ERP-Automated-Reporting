import { BrowserRouter, Routes, Route } from "react-router-dom";
import SalesDailyReport from "./pages/SalesDailyReport";
// import Home from "./pages/Home";
// import UserDetail from "./pages/UserDetail";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SalesDailyReport />} />

        {/* Dynamic Route: The ":id" is a placeholder */}
        {/* <Route path="/user/:id" element={<UserDetail />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
