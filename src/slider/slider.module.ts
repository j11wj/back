import { Module } from '@nestjs/common';
import { SliderController } from './slider.controller';
import { SliderService } from './slider.service';
import { PushModule } from '../push/push.module';

@Module({
  imports: [PushModule],
  controllers: [SliderController],
  providers: [SliderService],
  exports: [SliderService],
})
export class SliderModule {}
