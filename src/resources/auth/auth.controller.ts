import { Controller, Post, Body, Request, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { PasswordRecoveryDto } from './dto/password-recovery.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Auth } from './entities/auth.entity';
import { AuthGuard } from './guards/auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('sign-in')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate a user' })
  @ApiOkResponse({ description: 'Return access token and refresh token.' })
  @ApiUnauthorizedResponse({ description: 'Email does not exist.' })
  @ApiUnauthorizedResponse({ description: 'Incorrect password.' })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  async signIn(@Body() signInDto: SignInDto) {
    const user = await this.authService.authenticate(signInDto);
    return this.authService.createJwtToken(user);
  }

  @Post('sign-up')
  @ApiOperation({ summary: 'Create a user' })
  @ApiCreatedResponse({ description: 'Create a new user and return its id.' })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  async signUp(@Body() signUpDto: SignUpDto) {
    const user = await this.authService.createUser(signUpDto);
    return new Auth(user);
  }

  @Post('refresh-token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate new access token and refresh token, revoke the current refresh token' })
  @ApiOkResponse({ description: 'Returns new access token and refresh token.' })
  @ApiUnauthorizedResponse({ description: 'Not authorized because user not found.' })
  @ApiUnauthorizedResponse({ description: 'Your refresh token has been revoked.' })
  @ApiUnauthorizedResponse({ description: 'Your email or password has been changed, please login again.' })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('revoke-token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke the current refresh token' })
  @ApiOkResponse({ description: 'Your refresh token has been revoked.' })
  @ApiUnauthorizedResponse({ description: 'Your refresh token has already been revoked.' })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  revokeToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.revokeToken(refreshTokenDto);
  }

  @Post('send-confirmation-email')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send an account confirmation email' })
  @ApiOkResponse({ description: 'A confirmation email has been sent.' })
  @ApiBadRequestResponse({ description: 'Account has already been verified.' })
  sendConfirmationEmail(@Request() req) {
    return this.authService.sendConfirmationEmail(req.user);
  }

  @Post('confirm-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify the account' })
  @ApiOkResponse({ description: 'Email has been successfully verified.' })
  @ApiNotFoundResponse({ description: 'The code is invalid or expired.' })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  confirmEmail(@Body() confirmEmailDto: ConfirmEmailDto) {
    return this.authService.confirmEmail(confirmEmailDto);
  }

  @Post('password-recovery')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send an email to reset the password' })
  @ApiOkResponse({ description: 'A password reset email has been sent.' })
  @ApiNotFoundResponse({ description: 'Email does not exist.' })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  passwordRecovery(@Body() passwordRecoveryDto: PasswordRecoveryDto) {
    return this.authService.passwordRecovery(passwordRecoveryDto);
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset password with a valid recovery code' })
  @ApiOkResponse({ description: 'Password has been successfully reseted.' })
  @ApiNotFoundResponse({ description: 'The code is invalid or expired.' })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
