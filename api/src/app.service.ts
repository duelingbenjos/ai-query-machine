import { Injectable } from '@nestjs/common';
import { askQuestion } from './utils/data.utils';

@Injectable()
export class AppService {
  async askQuestion(question: string, prompt: string): Promise<string> {
    return await askQuestion(question, prompt);
  }
}
