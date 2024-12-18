'use server';

import '../../../envConfig';

import { LangChainStream } from 'ai';
import { NextResponse } from 'next/server';
import { inMemoryStore, vectorStore } from '@/utils/openai';

import { ChatOpenAI } from '@langchain/openai';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

export async function POST(req: Request) {
  try {
    const { stream, handlers } = LangChainStream();
    const { messages, selectedModelId } = await req.json();

    const currentMessage = messages[messages.length - 1].content;
    const previousMessages = messages.slice(-6, -1).map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    let llm;
    switch (selectedModelId) {
      case 'gpt-3.5-turbo':
        llm = new ChatOpenAI({
          modelName: 'gpt-3.5-turbo',
          openAIApiKey: process.env.OPENAI_API_KEY ?? 'xyzassdklfdskjsdsnmfbd',
          temperature: 0.5,
          streaming: true,
          callbacks: [handlers],
        });
        break;
      case 'gemini-1.5-flash':
        llm = new ChatGoogleGenerativeAI({
          model: 'gemini-1.5-flash',
          apiKey: process.env.GOOGLE_API_KEY ?? 'xyzassdklfdskjsdsnmfbd',
          streaming: true,
          callbacks: [handlers],
        });
        break;
      default:
        return NextResponse.json(
          { message: 'Invalid model ID' },
          { status: 400 }
        );
    }

    const mongoretriever = vectorStore().asRetriever({
      searchType: 'mmr',
      searchKwargs: { fetchK: 10, lambda: 0.25 },
    });

    const memoryretriver = await inMemoryStore.similaritySearch('', 3000)
    

    console.log('retriver', memoryretriver);

    const prompt = PromptTemplate.fromTemplate(`
      You are a smart and friendly assistant with access to a knowledge base.
    
      Provided Context (Knowledge Base):
      {context}

      Chat history:
      {chat_history}

       Uploaded Documents for user's Query Context:
       {additional_prompt}
    
      User's Query:
      {input}
    
      Instructions:
      1. First, analyze the user's query and uploaded documents(if any) carefully to understand its intent.
      2. If the query is specific to the provided context, use the context as your primary source of information and craft an accurate, relevant response based on it.
      3. If the query is general or unrelated to the context (e.g., greetings or casual questions), respond naturally using your general knowledge and conversational abilities.
      4. if you clearly understand the user's query and found relevant context then only use context to answer else ask for more information to answer. 
      5. Always ensure your response is clear, friendly, and tailored to the user's needs, regardless of whether it relies on the context or general knowledge.
      6. If you use the provided context to answer user's questions and if URL of document is present, end your response with for more detail refer [document_name](document_url).
      7. If the context are insufficient to answer the query, politely ask for more information.
         
      Provide your answer below:
    
      Answer:
    `);

    const combineDocsChain = await createStuffDocumentsChain({
      llm: llm,
      prompt,
      outputParser: new StringOutputParser(),
      documentSeparator: '\n',
    });

    const retrievalChain = await createRetrievalChain({
      retriever: mongoretriever,
      combineDocsChain,
    });

    retrievalChain.invoke({
      input: currentMessage,
      additional_prompt:memoryretriver,
      chat_history: previousMessages,
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (e) {
    return NextResponse.json({ message: 'Error Processing' }, { status: 500 });
  }
}
