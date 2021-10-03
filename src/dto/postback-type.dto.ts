import { Exclude, Expose} from 'class-transformer';
import { PostbackTypeEnum } from '../enums/postback-type.enum';

@Exclude()
export class PostbackTypeDto {
  @Expose() type: PostbackTypeEnum;
  @Expose() data: object;
}






