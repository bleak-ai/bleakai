import {Route, Routes} from "react-router-dom";
import "./App.css";
import Chat from "./components/Chat";
import CustomChat from "./components/CustomChat";
import Header from "./components/Header";
import Home from "./components/home/Home";
import {ThreadProvider} from "./contexts/ThreadContext";

function App() {
  return (
    <ThreadProvider>
      <Header />
      <main className="min-h-screen h-dvh px-2 md:px-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat assistantKey="default" />} />
          {/* <Route
            path="/prompt-tester"
            element={<Chat assistantKey="prompt-tester" />}
          /> */}
          <Route path="/prompt-tester" element={<CustomChat />} />
        </Routes>
      </main>

      {/* <Footer /> */}
    </ThreadProvider>
  );
}

export default App;
