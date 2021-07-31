import { Injectable } from '@nestjs/common';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Injectable()
export class AuthService {
  signIn(signInDto: SignInDto) {
    return 'This action authenticates a user';
  }

  signUp(signUpDto: SignUpDto) {
    return 'This action creates a user';
  }
}
