# Purpose

This repository contains a simple microservice providing a REST-API to demonstrate a use
case utilizing OpenAI's GPT. The user has the possibility to provide background data as PDFs
and ask questions based on the data inside the documents.

# Getting started

## Requirements

Make sure you have the following software installed:
* Node 18.12.1 or above
* NPM 9.1.2 or above
* Postman App (optional)

## Local Setup

Before you can start the service, you need to install all dependencies:

```shell
npm i
```

Since I'm using Redis as vector store you need to install it locally. The easiest
way to do so is to use docker:

```shell
docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest
```

Before you can run the service, you need to set the following environment variables:

```shell
export OPENAI_API_KEY=<your-api-key>
echo $OPENAI_API_KEY
```

Afterwards, you can run the software
```shell
npm start
```

## Testing

You can import the Postman collection into your local Postman app to test the API calls.