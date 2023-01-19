import {
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiParam, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppService } from './app.service';

class AskQuestionDto {
  @ApiProperty()
  question: string;
  @ApiPropertyOptional()
  context: string;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('ask')
  async askQuestion(
    @Query() params: AskQuestionDto,
  ): Promise<string | HttpException> {
    const { question, context } = params;
    try {
      if (!question) throw 'No question provided';
      if (question.length > 200) throw 'Question too long';
      if (context && context.length > 200) throw 'Context too long';
      return await this.appService.askQuestion(question, context);
    } catch (err) {
      return new HttpException(err, 500);
    }
  }
}
