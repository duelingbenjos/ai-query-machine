import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueryResponseEntity } from './entities/query.entity';
import { askQuestion, syncArticleInfoAndContent } from './utils/data.utils';

@Injectable()
export class AppService implements OnModuleInit {
  async onModuleInit() {
    console.log('init');
    // await syncArticleInfoAndContent();
  }
  async askQuestion(question: string, prompt: string): Promise<string> {
    return await askQuestion(question, prompt);
  }

  async getResponses(): Promise<QueryResponseEntity[]> {
    return await QueryResponseEntity.find({
      select: ['id', 'query', 'response'],
    });
  }
}
