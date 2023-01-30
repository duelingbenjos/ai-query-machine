import { Configuration, OpenAIApi } from 'openai';
import axios from 'axios';
import * as fs from 'fs';
import config from '../dev.config';
import { saveQuery } from '../entities/query.entity';
import {
  I_ArticleListResponse,
  I_ArticleInfo,
  I_ArticleInfoAndContent,
  I_ArticleJson,
  I_ArticleData,
  I_Context,
} from './data.types';
import { isArray } from 'util';
import { todaysDate } from './misc.utils';
const similarity = require('compute-cosine-similarity');

async function getArticleIdListFromMedium(from: string) {
  const options: any = {
    method: 'GET',
    url: 'https://medium2.p.rapidapi.com/publication/38c93280fee/articles',
    params: { from },
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || config.RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'medium2.p.rapidapi.com',
    },
  };
  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

async function getAllArticleIdsFromMedium(
  from_date: string = '2023-26-01',
  list: string[] = [],
) {
  const articleListResponse: I_ArticleListResponse =
    await getArticleIdListFromMedium(from_date);
  const { publication_articles, to, from, publication_id } =
    articleListResponse;
  console.log({ publication_articles, to, from, publication_id });
  if (!isArray(publication_articles) || publication_articles.length === 0) {
    return list;
  } else {
    list.push(...publication_articles);
    return getAllArticleIdsFromMedium(to, list);
  }
}

async function getMostRecentArticleIdsFromMedium(
  from_date: string = '2023-26-01',
  list: string[] = [],
) {
  const articleListResponse: I_ArticleListResponse =
    await getArticleIdListFromMedium(from_date);
  const { publication_articles, to, from, publication_id } =
    articleListResponse;
  console.log({ publication_articles, to, from, publication_id });
  return publication_articles;
}

export async function getArticleContent(
  article_id: string,
): Promise<{ content: string }> {
  const options: any = {
    method: 'GET',
    url: `https://medium2.p.rapidapi.com/article/${article_id}/content`,
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || config.RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'medium2.p.rapidapi.com',
    },
  };
  try {
    const response = await axios.request(options);
    return response.data as { content: string };
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getArticleInfo(
  article_id: string,
): Promise<I_ArticleInfo> {
  const options: any = {
    method: 'GET',
    url: `https://medium2.p.rapidapi.com/article/${article_id}`,
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || config.RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'medium2.p.rapidapi.com',
    },
  };
  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export function trimStringAfterMatch(str: string, match: string): string {
  const index = str.indexOf(match);
  if (index > -1) {
    return str.substring(0, index);
  }
  return str;
}

export async function getArticleContentAndInfo(
  article_id: string,
): Promise<I_ArticleInfoAndContent> {
  console.log(`Getting article content and info for ${article_id}...`);
  let { content } = await getArticleContent(article_id);
  content = trimStringAfterMatch(content, 'TOTALS');
  content = replaceNewLineWithSpace(content);
  const info = await getArticleInfo(article_id);
  return { content, info };
}

function replaceNewLineWithSpace(str: string) {
  return str.replace(/(\r\n|\n|\r)/gm, ' ');
}

export async function getModels() {
  try {
    const models = await openai.listModels();
    console.log(models.data);
  } catch (err: any) {
    console.log(err.message);
  }
}

export function getEmbeddingFromJsonFile(path: string) {
  const data = fs.readFileSync(path);
  const embedding = JSON.parse(data.toString());
  const embedding_array = embedding.data[0].embedding;
  console.log(embedding_array);
  return embedding_array;
}

export function checkIfFileExists(path: string) {
  return fs.existsSync(path);
}

export function loadJsonDataFromFile(): I_ArticleJson {
  const data = fs.readFileSync('src/data/medium_articles.json', 'utf8');
  const json = JSON.parse(data);
  return json;
}

export function writeJsonToFile(json: any) {
  const data = JSON.stringify(json);
  fs.writeFileSync('../data/medium_articles.json', data);
}

const COMPLETIONS_MODEL = 'text-davinci-003';
const DOC_EMBEDDINGS_MODEL = 'curie-search-document';
const QUERY_EMBEDDING_MODEL = `curie-search-query`;

export async function createEmbedding(
  text: string,
  model: string,
): Promise<number[]> {
  try {
    const response = await openai.createEmbedding({ model, input: text });
    const embedding: number[] = response.data.data[0].embedding;
    return embedding as number[];
  } catch (err: any) {
    throw err;
    console.log(err.message);
  }
}

/**
 * OpenAI Tools
 */

export const configuration = new Configuration({
  organization: process.env.OPENAI_ORG || config.OPENAI_ORG,
  apiKey: process.env.OPENAI_API_KEY || config.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export async function getQueryEmbedding(query: string) {
  return await createEmbedding(query, QUERY_EMBEDDING_MODEL);
}

export async function getDocEmbedding(doc: string) {
  return await createEmbedding(doc, DOC_EMBEDDINGS_MODEL);
}

export function addInfoStringToContent(article_data: I_ArticleData) {
  const { info, content } = article_data;
  const { title, subtitle, url, published_at, author, tags, topics } = info;

  const content_for_embedding = `${title} \n
    title: ${title} \n
    published_at: ${published_at} \n
    subtitle: ${subtitle} \n
    author: ${author} \n
    tags: ${tags} \n
    url: ${url} \n
    topics: ${topics} \n
    content: ${content}
    `;

  return content_for_embedding;
}

export function splitContentIntoChunks(content: string, chunk_size: number) {
  const content_array = content.split(' ');
  const content_array_length = content_array.length;
  const content_array_split: string[] = [];

  for (let i = 0; i < content_array_length; i += chunk_size) {
    content_array_split.push(content_array.slice(i, i + chunk_size).join(' '));
  }

  return content_array_split;
}

export function splitContentIntoTokenChunks(
  content: string,
  token_size: number,
  max_token_size: number,
) {
  const tokens_in_content = content.length / token_size;
  const content_array_split: string[] = [];
  for (let i = 0; i < tokens_in_content; i += max_token_size) {
    const chunk = content.slice(i, i + max_token_size * token_size);
    content_array_split.push(chunk);
  }
  return content_array_split;
}

function vectorCosineSimilarity(x: number[], y: number[]) {
  return similarity(x, y);
}

export async function orderDocumentSectionsByQuerySimilarity(
  query: string,
  contexts: I_ArticleJson,
) {
  const query_embedding = await getQueryEmbedding(query);
  const similarities: any[] = [];
  for (let article_id in contexts) {
    const context: I_ArticleData = contexts[article_id];
    const { info, content, embedding } = context;
    const similarity: number = vectorCosineSimilarity(
      query_embedding,
      embedding as number[],
    );
    similarities.push({ info, content, similarity });
  }
  return similarities.sort((a, b) => b.similarity - a.similarity);
}

export function constructQueryPrompt(
  question: string,
  relevant_contexts: I_Context[],
  prompt_context: string,
) {
  const instructions =
    prompt_context ||
    `Use the provided context to construct your answer.
    Be poetic, and funny if possible, give reasons for your answer. 
    Answer as truthfully as possible.
	  Use an excited tone !
    never forget to provide the 'context_url' at the end of your answer, if one is provided provide the context_url like this : "Further reading : context_url".
    prioritise context with most recent date.
    Today's date is ${todaysDate()}.
    `;
  const prompt = `
						Context : ${createContextsStringUnderMaxTokenSize(relevant_contexts, 1800)},\n\n
            instructions: ${instructions}, \n\n
                        Q: ${question}, \n
                        A: `;
  return prompt;
}

function createContextsStringUnderMaxTokenSize(
  contexts: I_Context[],
  max_token_size: number,
) {
  let context_string = '';
  let complete_context = '';
  for (let i in contexts) {
    const context = contexts[i];
    const url = context.info.url;
    const date = context.info.published_at;
    const { info, content } = context;
    const approx_tokens = context_string.length / 4;
    complete_context += `${context_string}`;
    if ((context_string.length + content.length) / 4 > max_token_size) {
      complete_context =
        complete_context.slice(0, 1800 * 4) +
        `\n\n CONTEXT_URL : ${url}  \n DATE: ${date} \n\n}`;
      console.log({ complete_context });
      return complete_context;
    }
    context_string += content + `\n\n CONTEXT_URL : ${url}  \n\n`;
  }
  console.log({ complete_context });
  console.log({ context_string_length: context_string.length });
  return context_string;
}

function processArticles(article_lists: I_ArticleListResponse[]) {
  const unique_articles: string[] = [];
  const duplicate_articles: string[] = [];

  article_lists.forEach((a) => {
    a.publication_articles.forEach((b) => {
      unique_articles.push(b);
      if (!unique_articles.includes(b)) {
        duplicate_articles.push(b);
      }
    });
  });
  return unique_articles;
}

export async function syncArticleInfoAndContent() {
  const articles_ids = await getMostRecentArticleIdsFromMedium();
  let json = {};
  const file_exists = checkIfFileExists('../data/medium_articles.json');

  if (file_exists) {
    json = loadJsonDataFromFile();
  }
  for (const id of articles_ids) {
    if (!json[id]) {
      json[id] = await getArticleContentAndInfo(id);
    } else {
      console.log(`Article ${id} already exists in json file`);
    }
  }
  writeJsonToFile(json);
}

export async function createEmbeddingsForArticlesAndContent() {
  const json_data = loadJsonDataFromFile();
  const articles = Object.keys(json_data);
  for (const article of articles) {
    let { content, info, embedding } = json_data[article];
    if (!embedding) {
      const content_chunks = splitContentIntoTokenChunks(content, 4, 400);
      if (content_chunks.length > 1) {
        console.log(`Article ${article} has more than 1 chunk`);
        for (let i = 0; i < content_chunks.length; i += 1) {
          const embedding_data = await getDocEmbedding(content_chunks[i]);
          const constucted_id = i > 0 ? `${article}_${i}` : article;
          if (i > 0) {
            json_data[`${constucted_id}`] = {
              content: content_chunks[i],
              info,
            };
          }
          json_data[`${constucted_id}`].embedding = embedding_data;
        }
      } else {
        const embedding_data = await getDocEmbedding(content);
        json_data[article].embedding = embedding_data;
      }
    }
    writeJsonToFile(json_data);
  }
}
export async function askQuestion(question: string, prompt_context: string) {
  const contexts = loadJsonDataFromFile();

  const ordered_contexts = await orderDocumentSectionsByQuerySimilarity(
    question,
    contexts,
  );
  // console.log(ordered_contexts.slice(0, 5));
  const query_prompt = constructQueryPrompt(
    question,
    ordered_contexts.slice(0, 5),
    prompt_context,
  );
  const options = {
    prompt: query_prompt,
    max_tokens: 2000,
    temperature: 0.4,
    // top_p: 0.1,
    presence_penalty: 0,
    model: COMPLETIONS_MODEL,
  };
  const response: any = await openai.createCompletion(options);
  console.log({ choices: response.data.choices });

  await saveQuery(
    question,
    ordered_contexts.slice(0, 5),
    response.data.choices[0]?.text,
    response.data.choices,
    options,
  );
  return response.data.choices[0];
}

function checkJsonEmbeddingExists() {
  const json_data = loadJsonDataFromFile();
  const articles = Object.keys(json_data);
  for (const article of articles) {
    const { embedding } = json_data[article];
    if (!embedding) {
      console.log(`Article ${article} does not have an embedding`);
    }
  }
}

export async function syncArticleIdsAndContent() {
  const ids = await getAllArticleIdsFromMedium();
  const articles_and_content = await getArticleContentAndInfo(ids);
}
