import { Configuration, OpenAIApi } from 'openai';
import axios from 'axios';
import * as fs from 'fs';
// import similarity from 'compute-cosine-similarity';
const similarity = require('compute-cosine-similarity');

async function getArticleIdListFromMedium(from: string) {
  const options: any = {
    method: 'GET',
    url: 'https://medium2.p.rapidapi.com/publication/38c93280fee/articles',
    params: { from },
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
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
  from_date: string = '2020-01-01',
  list: string[] = [],
) {
  const articleListResponse: I_ArticleListResponse =
    await getArticleIdListFromMedium(from_date);
  const { publication_articles, to, from, publication_id } =
    articleListResponse;
  if (publication_articles.length === 0) {
    return list;
  } else {
    list.push(...publication_articles);
    return getAllArticleIdsFromMedium(to, list);
  }
}

export interface I_ArticleListResponse {
  publication_articles: string[];
  to: string;
  from: string;
  publication_id: string;
}

export interface I_ArticleInfo {
  id: string;
  tags: string[];
  claps: number;
  last_modified_at: string;
  published_at: string;
  url: string;
  image_url: string;
  lang: string;
  publication_id: string;
  word_count: number;
  title: string;
  reading_time: number;
  responses_count: number;
  voters: number;
  topics: string[];
  author: string;
  subtitle: string;
}

export type T_ArticleContent = string;

export interface I_ArticleInfoAndContent {
  info: I_ArticleInfo;
  content: T_ArticleContent;
}

export interface I_ArticleData extends I_ArticleInfoAndContent {
  info: I_ArticleInfo;
  content: T_ArticleContent;
  embedding?: number[];
}

export interface I_ArticleJson {
  [key: string]: I_ArticleData;
}

export interface I_Context {
  info: I_ArticleInfo;
  content: T_ArticleContent;
  similarity: number;
}

export async function getArticleContent(
  article_id: string,
): Promise<{ content: string }> {
  const options: any = {
    method: 'GET',
    url: `https://medium2.p.rapidapi.com/article/${article_id}/content`,
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
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
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
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

const COMPLETIONS_MODEL = 'text-davinci-002';
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
  organization: process.env.OPENAI_ORG,
  apiKey: process.env.OPENAI_API_KEY,
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
  statement: string,
  relevant_contexts: I_Context[],
  prompt_context: string,
) {
  const context_string =
    prompt_context ||
    `The provided contexts are from Lamden's blog. 
    Answer with as much content as you can.
    Answer as truthfully as possible, if you're not sure, say "I don't know".
	Use an excited tone !
    `;
  const prompt = `${context_string}
						Context : ${createContextsStringUnderMaxTokenSize(relevant_contexts, 2000)}
                        Q: ${statement}
                        A: `;
  return prompt;
}

function createContextsStringUnderMaxTokenSize(
  contexts: I_Context[],
  max_token_size: number,
) {
  let context_string = '';
  for (let i in contexts) {
    const context = contexts[i];
    const { info, content } = context;
    const approx_tokens = context_string.length / 4;
    context_string += '\n';
    if ((context_string.length + content.length) / 4 > max_token_size) {
      return;
    }
    context_string += content;
  }
  console.log(context_string);
  return context_string;
}

export async function getCompletion(complete_prompt) {
  const COMPLETIONS_MODEL = 'text-davinci-002';

  // console.log(complete_prompt);
  try {
    return await openai.createCompletion({
      prompt: complete_prompt,
      max_tokens: 2000,
      temperature: 0,
      // top_p: 0.1,
      presence_penalty: 0,
      model: COMPLETIONS_MODEL,
    });
  } catch (err: any) {
    console.log(err.message);
    throw err;
  }
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

async function syncArticleInfoAndContent(
  article_lists: I_ArticleListResponse[],
) {
  const articles_ids = processArticles(article_lists);
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

async function createEmbeddingsForArticlesAndContent() {
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
  const query_prompt = constructQueryPrompt(
    question,
    ordered_contexts.slice(0, 5),
    prompt_context,
  );
  const response: any = await getCompletion(query_prompt);
  console.log({ choices: response.data.choices });
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
