import {Route, Routes} from "react-router-dom";
import "./App.css";
import Chat from "./components/Chat";
import Header from "./components/Header";
import Home from "./components/home/Home";

function App() {
  return (
    <div className="min-h-screen h-dvh px-2 md:px-4">
      <Header />
      <main className="h-[calc(100dvh-4rem)] md:h-[calc(100dvh-8rem)]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          {/* <Route
            path="/prompt-tester"
            element={<Chat assistantKey="prompt-tester" />}
            /> */}
          <Route path="/prompt-tester" element={<Chat />} />
        </Routes>
      </main>

      {/* <Footer /> */}
    </div>
  );
}

export default App;
