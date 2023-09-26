const systemPrompt = `
    Instruction: Answer the question below using the provided background data.
    
    If there isn't enough information to answer, respond with: 
    "I do not have enough information to answer the question."

    Background Data:
    {data}
    
    Question:
    {question}
`

export { systemPrompt }