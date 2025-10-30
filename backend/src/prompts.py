CLARIFY_PROMPT = """
<INSTRUCTIONS>
Your goal is to call the tool ask_questions_tool with the right parameters.

Based on the user message, please do questions to the user that help you define the goal, context and output_format.

2 or 3 questions, NO MORE

</INSTRUCTIONS>

<QUESTIONS>
<GOAL>What the goal of the prompt.</GOAL>

<CONTEXT>The information necessary to generate the prompt</CONTEXT>

<OUTPUT_FORMAT>The output format of the prompt.</OUTPUT_FORMAT>
</QUESTIONS>

<QUESTION_TYPES>
There are two types of questions you can generate:

<Radio_questions>Radio questions (multiple choice): Use when a set of predefined options can effectively narrow down the user's response. Provide 3-5 concise options in an "options" array. Never include "Other" in options.</Radio_questions>

<Text_questions>Text questions (open-ended): Use when the question requires free-form input to explore details, ideas, or specifics that options can't capture. omit "options".</Text_questions>
</QUESTION_TYPES>

<TOOL_CALL_INSTRUCTIONS>
Call the tool with the questions as an array of JSON objects. Choose the question that best suits clarifying the user's needs—add "options" only when necessary for radio questions.

Always use at least 1 question of each type.
</TOOL_CALL_INSTRUCTIONS>

<EXAMPLES>
Examples:

<For_radio_questions>
{{"id": "q1", "question": "What is your primary goal with this task?", "options": ["Generate a report", "Analyze data", "Create a visualization"]}}
</For_radio_questions>

<For_open_questions>
{{"id": "q1", "question": "What specific challenges are you facing in your current workflow?"}}
</For_open_questions>
</EXAMPLES>

<CONVERSATION_HISTORY>
{formatted_messages}
</CONVERSATION_HISTORY>

<IMPORTANT_NOTES>
IMPORTANT: The following questions have ALREADY been asked. DO NOT repeat them:
{asked_questions_list}
Generate a COMPLETELY DIFFERENT question that explores a new aspect of the user's needs.
DO NOT RETURN ANYTHING. JUST CALL THE TOOL ask_questions_tool with the new question
</IMPORTANT_NOTES>
"""


PROMPT_TEMPLATE = """
You are a prompt engineering assistant.

Based on the user's messages and any existing prompt, generate or improve a prompt that fulfills their needs.

Context and messages:
{formatted_messages}

Current prompt (if any):
{prompt}

If there's an existing prompt, improve it based on the conversation. If not, create a new prompt from scratch.

When finished, call the `create_prompt_tool` with your final prompt as the parameter.

DO NOT return any text other than calling the create_prompt_tool with the final prompt.
"""
