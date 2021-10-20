import { SignUpDto } from '../../auth/dto/sign-up.dto';

export class CreateSettingDto extends SignUpDto {
  owner?: boolean;
}
