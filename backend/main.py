def main():
    answers = [
        {"question": "What is your technical background?", "answer": "Intermediate"},
        {
            "question": "What is your goal for learning about React hooks?",
            "answer": "Learn how to use them in projects",
        },
        {
            "question": "What output format would you prefer for the explanation?",
            "answer": "A detailed text explanation",
        },
    ]

    formatted_answers = "\n".join(
        [
            f"Question {idx + 1}: {answer['question']} Answer {idx + 1}: {answer['answer']}"
            for idx, answer in enumerate(answers)
        ]
    )

    print(formatted_answers)


if __name__ == "__main__":
    main()
