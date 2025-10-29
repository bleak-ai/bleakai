export interface AssistantConfig {
  id: string;
  name: string;
  description?: string;
  environmentVariable?: string;
}

export const ASSISTANTS: Record<string, AssistantConfig> = {
  default: {
    id: import.meta.env.VITE_PUBLIC_DEFAULT_ASSISTANT_ID,
    name: "Default Assistant",
    description: "General purpose assistant",
    environmentVariable: "VITE_PUBLIC_DEFAULT_ASSISTANT_ID"
  },
  "prompt-tester": {
    id: import.meta.env.VITE_PUBLIC_PROMPT_TESTER_ASSISTANT_ID,
    name: "Prompt Tester Assistant",
    description: "Prompt Tester assistant",
    environmentVariable: "VITE_PUBLIC_PROMPT_TESTER_ASSISTANT_ID"
  }
  // Add more assistants here as needed
};

export const getAssistantId = (assistantKey: string = "default"): string => {
  const assistant = ASSISTANTS[assistantKey];
  if (!assistant) {
    console.warn(
      `Assistant "${assistantKey}" not found, falling back to default`
    );
    return ASSISTANTS.default.id;
  }

  if (!assistant.id) {
    console.error(`Assistant "${assistantKey}" has no ID configured`);
    throw new Error(`Assistant "${assistantKey}" is not properly configured`);
  }

  return assistant.id;
};

export const getAvailableAssistants = (): AssistantConfig[] => {
  return Object.values(ASSISTANTS).filter((assistant) => assistant.id);
};
