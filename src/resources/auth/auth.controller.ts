import { Controller, Post, Body, UseGuards, HttpCode, UseInterceptors, ClassSerializerInterceptor, Res, Req } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCookieAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags, ApiUnauthorizedResponse, refs } from '@nestjs/swagger';
import { FastifyRequest, FastifyReply } from 'fastify';

import { AuthService } from './auth.service';
import { SignInDto, SignUpDto, ConfirmEmailDto, PasswordRecoveryDto, ResetPasswordDto } from './dto';
import { AuthUserDto } from '../users/dto';
import { Jwt, ErrorMessage } from './entities';
import { AuthGuard } from './guards/auth.guard';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { RateLimitInterceptor } from '../../common/interceptors';
import { RateLimitOptions } from '../../decorators/rate-limit-options.decorator';

@ApiTags('Authentication')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('sign-in')
  @UseInterceptors(RateLimitInterceptor, ClassSerializerInterceptor)
  @RateLimitOptions({ catchMode: 'error', ttl: 300, limit: 5, continueWithCaptcha: true })
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate a user' })
  @ApiOkResponse({ description: 'Return access token and refresh token', type: Jwt })
  @ApiUnauthorizedResponse({ description: 'Email does not exist or incorrect password', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error.', type: ErrorMessage })
  async signIn(@Res({ passthrough: true }) response: FastifyReply, @Body() signInDto: SignInDto) {
    const jwt = await this.authService.authenticate(signInDto);
    response.setCookie('refresh_token', jwt.refreshToken, { maxAge: jwt.refreshTokenExpiry });
    response.setCookie('authenticated', 'true', { httpOnly: false, maxAge: jwt.refreshTokenExpiry });
    return jwt;
  }

  @Post('sign-up')
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOperation({ summary: 'Create a user' })
  @ApiCreatedResponse({ description: 'Create a new user, return access token and refresh token', type: Jwt })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  @ApiServiceUnavailableResponse({ description: 'Errors from third party API', type: ErrorMessage })
  async signUp(@Res({ passthrough: true }) response: FastifyReply, @Body() signUpDto: SignUpDto) {
    const jwt = await this.authService.signUp(signUpDto);
    response.setCookie('refresh_token', jwt.refreshToken, { maxAge: jwt.refreshTokenExpiry });
    response.setCookie('authenticated', 'true', { httpOnly: false, maxAge: jwt.refreshTokenExpiry });
    return jwt;
  }

  @Post('refresh-token')
  @UseInterceptors(ClassSerializerInterceptor)
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Generate new access token and refresh token, revoke the current refresh token' })
  @ApiOkResponse({ description: 'Returns new access token and refresh token', type: Jwt })
  @ApiUnauthorizedResponse({ description: 'Not authorized, refresh token has been revoked, or login information has been changed', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  async refreshToken(@Req() request: FastifyRequest, @Res({ passthrough: true }) response: FastifyReply) {
    const refreshToken = request.cookies['refresh_token'];
    const jwt = await this.authService.refreshToken({ refreshToken: refreshToken });
    response.setCookie('refresh_token', jwt.refreshToken, { maxAge: jwt.refreshTokenExpiry });
    response.setCookie('authenticated', 'true', { httpOnly: false, maxAge: jwt.refreshTokenExpiry });
    return jwt;
  }

  @Post('revoke-token')
  @HttpCode(204)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Revoke the current refresh token' })
  @ApiNoContentResponse({ description: 'Your refresh token has been revoked' })
  @ApiUnauthorizedResponse({ description: 'Your refresh token has already been revoked', type: ErrorMessage })
  @ApiBadRequestResponse({ description: 'Validation error', type: ErrorMessage })
  async revokeToken(@Req() request: FastifyRequest, @Res({ passthrough: true }) response: FastifyReply) {
    const refreshToken = request.cookies['refresh_token'];
    await this.authService.revokeToken({ refreshToken: refreshToken });
    const expires = new Date(0);
    response.setCookie('refresh_token', '', { expires });
    response.setCookie('authenticated', 'false', { httpOnly: false, expires });
  }

  @Post('send-confirmation-email')
  @UseInterceptors(RateLimitInterceptor)
  @RateLimitOptions({ catchMode: 'success', ttl: 120, limit: 1 })
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
  @UseInterceptors(RateLimitInterceptor)
  @RateLimitOptions({ catchMode: 'success', ttl: 120, limit: 1 })
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
