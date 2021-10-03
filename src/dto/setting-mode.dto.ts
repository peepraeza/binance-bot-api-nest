import { Exclude, Expose } from 'class-transformer';
import { SettingTypeEnum } from '../enums/setting-type.enum';

@Exclude()
export class SettingModeDto {
  @Expose() settingType: SettingTypeEnum;
  @Expose() isConfirmed: boolean;
}






