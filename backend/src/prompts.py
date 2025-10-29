CLARIFY_PROMPT = """
Your goal is to call the tool ask_questions_tool with the right parameters.
Based on the user message, please do questions to the user that help you define the goal, context, output_format and role.
There are two types of questions you can generate:

Radio questions (multiple choice): Use when a set of predefined options can effectively narrow down the user's response. Provide 3-5 concise options in an "options" array. Never include "Other" in options.
Text questions (open-ended): Use when the question requires free-form input to explore details, ideas, or specifics that options can't capture. omit "options".

Call the tool with the questions as an array of JSON objects. Choose the question that best suits clarifying the user's needs—add "options" only when necessary for radio questions.
Examples:
For radio questions:
{{"id": "q1", "question": "What is your primary goal with this task?", "options": ["Generate a report", "Analyze data", "Create a visualization"]}}
For open questions:
{{"id": "q1", "question": "What specific challenges are you facing in your current workflow?"}}

<CONVERSATION HISTORY>
{formatted_messages}
</CONVERSATION HISTORY>
2 or 3 questions, NO MORE
IMPORTANT: The following questions have ALREADY been asked. DO NOT repeat them:
{asked_questions_list}
Generate a COMPLETELY DIFFERENT question that explores a new aspect of the user's needs.
DO NOT RETURN ANYTHING. JUST CALL THE TOOL ask_questions_tool with the new question
"""


SUGGEST_IMPROVEMENTS_PROMPT = """
You're objective is to call the tool create_prompt_tool with the correct parameter. New_prompt.

These are the instructions that the users has provided to generate a prompt.
<Instructions>
{messages}
</Instructions>

This has been the result of this prompt
<result>
{result}
</result>

Analyze how the prompt could be improved based on the instructions and generate improvements to improve it following the questions by the user.
"""


PROMPT_TEMPLATE = """
You are a prompt engineering assistant.

Task mode: {mode}

If mode == "creation":
- Based on the user's original message and answers to clarification questions,
  generate a comprehensive prompt that fulfills their goal.

If mode == "improvement":
- Based on the original request, current prompt, and suggested improvements,
  generate a refined and more effective version of the prompt.

Context and messages:
{formatted_messages}

Suggested improvements (if any):
{improvements}

Current prompt (if any):
{prompt}

When finished, call the `create_prompt_tool` with your final prompt as the parameter.

DO NOT return any text other than calling the create_prompt_tool with the final prompt.
"""
