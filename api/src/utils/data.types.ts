
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
  