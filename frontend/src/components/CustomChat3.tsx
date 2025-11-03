import {Bleakai} from "bleakai";
import React from "react";

// Example tool class for demonstration

export default function CustomChat3() {
  // Initialize with your backend configuration
  const bleakaiInstance = new Bleakai({
    url: "http://localhost:8000/stream",
    headers: {"Content-Type": "application/json"} // Optional headers
    // toolRegistry: {
    //   ask_questions: AskQuestions, // Register available tools
    //   // Add other tools as needed
    // }
  });

  console.log("Bleakai instance initialized:", {
    url: bleakaiInstance.getUrl(),
    headers: bleakaiInstance.getHeaders(),
    tools: Object.keys(bleakaiInstance.getToolRegistry())
  });

  React.useEffect(() => {
    async function handleStream() {
      const response = await bleakaiInstance.stream();

      console.log("Stream response:", response);
    }

    handleStream();
  });

  return (
    <div>
      <h2>CustomChat3 - Bleakai Instance</h2>
      <p>Check console for Bleakai initialization details</p>
    </div>
  );
}
