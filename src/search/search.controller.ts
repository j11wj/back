import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Public()
  @Post('track')
  @ApiOperation({ summary: 'تسجيل كلمة بحث لتحليل الأكثر شهرة' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['term'],
      properties: { term: { type: 'string', example: 'بركر' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Search term tracked' })
  track(@Body('term') term: string) {
    return this.search.track(term ?? '');
  }

  @Public()
  @Get('popular')
  @ApiOperation({ summary: 'الكلمات الأكثر شهرة حسب خوارزمية التكرار والحداثة' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Popular search terms' })
  popular(@Query('limit') limit?: string) {
    const n = Number(limit);
    return this.search.getPopular(Number.isFinite(n) ? n : 10);
  }
}

