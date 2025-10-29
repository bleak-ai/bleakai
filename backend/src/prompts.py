CLARIFY_PROMPT = """
    Your goal is to call the tool ask_questions_tool with the right parameters.

    Based on the user message, please do questions to the user that help you define the goal, context, output_format and role.

    Call the tool with the questions as an array of JSON objects.
    questions: [
        {{"id": "q1", "question": "question1", "options":["option1", "option2", "option3"]}},
    ]
    <CONVERSATION HISTORY>
    {formatted_messages}
    </CONVERSATION HISTORY>

    1 question, NO MORE

    Never include Other in the options.

    IMPORTANT: The following questions have ALREADY been asked. DO NOT repeat them:
    {asked_questions_list}
    Generate a COMPLETELY DIFFERENT question that explores a new aspect of the user's needs.

    DO NOT RETURN ANYTHING. JUST CALL THE TOOL ask_questions_tool with the new options
  """


CREATE_PROMPT = """
    Based on the user's original message and the answers to the clarification questions, generate a comprehensive prompt that addresses the user's needs.

    The messages and answers are:
    {messages}

    Create a well-structured prompt that incorporates:
    - The goal identified from the answers
    - The context provided by the user
    - The desired output format
    - The appropriate role/tone for the AI

    Call the create_prompt_tool with your generated prompt as the parameter.

    DO NOT return any text other than calling the create_prompt_tool with the prompt.
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


APPLY_IMPROVEMENTS_PROMPT = """
    Based on the original user request and the suggested improvements, generate an improved prompt.

    Original context and requirements:
    {formatted_messages}

    Suggested improvements to apply:
    {improvements}

    Create a new, improved prompt that incorporates these suggestions while maintaining the original intent.

    Call the create_prompt_tool with your improved prompt as the parameter.

    DO NOT return any text other than calling the create_prompt_tool with the improved prompt.
    """
