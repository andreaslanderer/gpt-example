import express from 'express';
import { createClient } from "redis";
import { RedisVectorStore } from "langchain/vectorstores/redis";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";
import { systemPrompt } from './prompt.js';

const keyOpenAI = process.env.OPENAI_KEY;

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const port = process.env.PORT ?? 3000;
const llmName = process.env.LLM_NAME ?? 'gpt-3.5-turbo-0301'
const llmTemperature = process.env.LLM_TEMPERATURE ?? 0.0

const client = createClient({ url: redisUrl });
const app = express();
const llm = new OpenAI({
    modelName: llmName,
    temperature: llmTemperature,
    openAIApiKey: keyOpenAI
});
const prompt = PromptTemplate.fromTemplate(systemPrompt);

app.use(express.json());
app.set('json spaces', 2);

app.post(`/store`, handleAsyncErrors(async (req, res) => {
    const { url } = req.body;
    if (!url) throw new BadRequestError('Missing property: url');

    const docs = await loadDocuments(url);
    const split = await splitDocuments(docs);
    await createEmbeddings(split);

    res.send({ 'message': 'Successfully created embeddings' });
}));

app.post('/search', handleAsyncErrors(async (req, res) => {
    const { question } = req.body;
    if (!question) throw new BadRequestError('Missing property: question');

    const {simpleRes, result} = await getCompletionResult(question);
    res.send({
        completion: result,
        background: simpleRes.map(d => ({ content: d.pageContent, source: d.metadata.source }))
    });
}));

function handleAsyncErrors(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

async function withRedisClient(fn) {
    try {
        await client.connect();
        return await fn();
    } finally {
        await client.disconnect();
    }
}

async function loadDocuments(path) {
    return new PDFLoader(path, { splitPages: false }).load();
}

async function splitDocuments(documents) {
    return new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 100
    }).splitDocuments(documents);
}

async function createEmbeddings(splitDocuments) {
    return withRedisClient(async () => {
        const redisConfig = {
            redisClient: client,
            indexName: "docs",
        };
        await RedisVectorStore.fromDocuments(
            splitDocuments,
            new OpenAIEmbeddings({ openAIApiKey: keyOpenAI }),
            redisConfig
        );
    });
}

async function query(question) {
    return withRedisClient(async () => {
        const redisConfig = {
            redisClient: client,
            indexName: "docs",
        };
        const vectorStore = new RedisVectorStore(
            new OpenAIEmbeddings({ openAIApiKey: keyOpenAI }),
            redisConfig
        );

        return vectorStore.similaritySearch(question, 10);
    });
}

async function getCompletionResult(question) {
    const simpleRes = await query(question);
    console.log(simpleRes);

    const formattedPrompt = await prompt.format({data: simpleRes.map(d => d.pageContent), question});
    console.log('Calling OpenAI service', formattedPrompt);

    const result = await llm.predict(formattedPrompt);
    return {simpleRes, result};
}

app.listen(port, () => {
    console.log(`Server successfully started at port ${port}.`);
});

class BadRequestError extends Error {}