import { PartialType } from '@nestjs/swagger';
import { CreateHomeSliderDto } from './create-home-slider.dto';

export class UpdateHomeSliderDto extends PartialType(CreateHomeSliderDto) {}
