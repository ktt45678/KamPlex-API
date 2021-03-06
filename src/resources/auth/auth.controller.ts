import { Controller, Post, Body, UseGuards, HttpCode, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags, ApiUnauthorizedResponse, refs } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { PasswordRecoveryDto } from './dto/password-recovery.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { Jwt } from './entities/jwt.enity';
import { ErrorMessage } from './entities/error-message.entity';
import { AuthGuard } from './guards/auth.guard';
import { AuthUser } from 'src/decorators/auth-user.decorator';

@ApiTags('Authentication')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('sign-in')
  @UseInterceptors(ClassSerializerInterceptor)
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate a user' })
  @ApiOkResponse({ description: 'Return access token and refresh token', type: Jwt })
  @ApiUnauthorizedResponse({ description: 'Email does not exist or incorrect password', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error.', type: ErrorMessage })
  async signIn(@Body() signInDto: SignInDto) {
    return this.authService.authenticate(signInDto);
  }

  @Post('sign-up')
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOperation({ summary: 'Create a user' })
  @ApiCreatedResponse({ description: 'Create a new user, return access token and refresh token', type: Jwt })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiServiceUnavailableResponse({ description: 'Errors from third party API', type: ErrorMessage })
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('refresh-token')
  @UseInterceptors(ClassSerializerInterceptor)
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate new access token and refresh token, revoke the current refresh token' })
  @ApiOkResponse({ description: 'Returns new access token and refresh token', type: Jwt })
  @ApiUnauthorizedResponse({ description: 'Not authorized, refresh token has been revoked, or login information has been changed', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('revoke-token')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke the current refresh token' })
  @ApiNoContentResponse({ description: 'Your refresh token has been revoked' })
  @ApiUnauthorizedResponse({ description: 'Your refresh token has already been revoked', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  revokeToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.revokeToken(refreshTokenDto);
  }

  @Post('send-confirmation-email')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send an account confirmation email' })
  @ApiNoContentResponse({ description: 'A confirmation email has been sent' })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Account has already been verified', type: ErrorMessage })
  @ApiServiceUnavailableResponse({ description: 'Errors from third party API', type: ErrorMessage })
  sendConfirmationEmail(@AuthUser() authUser: AuthUserDto) {
    return this.authService.sendConfirmationEmail(authUser);
  }

  @Post('confirm-email')
  @HttpCode(204)
  @ApiOperation({ summary: 'Verify the account' })
  @ApiOkResponse({ description: 'Return access token and refresh token', type: Jwt })
  @ApiNotFoundResponse({ description: 'The code is invalid or expired', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error.', type: ErrorMessage })
  async confirmEmail(@Body() confirmEmailDto: ConfirmEmailDto) {
    return this.authService.confirmEmail(confirmEmailDto);
  }

  @Post('password-recovery')
  @HttpCode(204)
  @ApiOperation({ summary: 'Send an email to reset the password' })
  @ApiNoContentResponse({ description: 'A password reset email has been sent' })
  @ApiNotFoundResponse({ description: 'Email does not exist', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  passwordRecovery(@Body() passwordRecoveryDto: PasswordRecoveryDto) {
    return this.authService.passwordRecovery(passwordRecoveryDto);
  }

  @Post('reset-password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Reset password with a valid recovery code' })
  @ApiOkResponse({ description: 'Return access token and refresh token', type: Jwt })
  @ApiNotFoundResponse({ description: 'The code is invalid or expired', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
