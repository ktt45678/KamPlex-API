import { Model } from 'mongoose';
import { CACHE_MANAGER, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Cache } from 'cache-manager';
import { nanoid } from 'nanoid/async'
import * as bcrypt from 'bcrypt';

import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { PasswordRecoveryDto } from './dto/password-recovery.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User, UserDocument } from '../../schemas/user.schema';
import { Jwt } from './entities/jwt.enity';
import { StatusCode } from '../../enums/status-code.enum';
import { CachePrefix } from '../../enums/cache-prefix.enum';
import { HttpEmailService } from '../../common/http-email/http-email.service';
import { RedisCacheService } from '../../common/redis-cache/redis-cache.service';
import { ACCESS_TOKEN_EXPIRY, PASSWORD_HASH_ROUNDS, REFRESH_TOKEN_EXPIRY } from '../../config';
import { MailgunTemplate } from '../../enums/mailgun-template.enum';

@Injectable()
export class AuthService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>, private redisCacheService: RedisCacheService,
    private httpEmailService: HttpEmailService, private jwtService: JwtService) { }

  async authenticate(signInDto: SignInDto) {
    const user = await this.userModel.findOne({ email: signInDto.email }).populate('roles', { users: 0, createdAt: 0, updatedAt: 0 }).exec();
    if (!user)
      throw new HttpException({ code: StatusCode.EMAIL_NOT_EXIST, message: 'Email does not exist' }, HttpStatus.UNAUTHORIZED);
    const isValidPassword = await this.comparePassword(signInDto.password, user.password);
    if (!isValidPassword)
      throw new HttpException({ code: StatusCode.INCORRECT_PASSWORD, message: 'Incorrect password' }, HttpStatus.UNAUTHORIZED);
    return user;
  }

  async createUser(signUpDto: SignUpDto) {
    signUpDto.password = await this.hashPassword(signUpDto.password);
    const user = new this.userModel(signUpDto);
    // Generate activation code
    user.codes.activationCode = await nanoid();
    const newUser = await user.save();
    // Send a confirmation email
    await this.sendConfirmationEmail(newUser, newUser.codes.activationCode);
    return newUser;
  }

  async sendConfirmationEmail(user: User | UserDocument, activationCode?: string) {
    // Generate a new activation code
    if (!activationCode) {
      activationCode = await nanoid();
      user = await this.userModel.findByIdAndUpdate(user._id, { 'codes.activationCode': activationCode }, { new: true }).lean().exec();
    }
    await this.httpEmailService.sendEmailMailgun(user.email, user.username, 'Confirm your email', MailgunTemplate.CONFIRM_EMAIL, {
      recipient_name: user.username,
      button_url: `${process.env.WEBSITE_URL}/confirm-email?code=${activationCode}`
    });
    return { message: 'A confirmation email has been sent' };
  }

  async confirmEmail(confirmEmailDto: ConfirmEmailDto) {
    const user = await this.userModel.findOneAndUpdate({ 'codes.activationCode': confirmEmailDto.activationCode }, {
      $set: { isVerified: true },
      $unset: { 'codes.activationCode': 1 }
    }).lean().exec();
    if (!user)
      throw new HttpException({ code: StatusCode.INVALID_CODE, message: 'The code is invalid or expired' }, HttpStatus.NOT_FOUND);
    return { message: 'Email has been successfully verified' };
  }

  async passwordRecovery(passwordRecoveryDto: PasswordRecoveryDto) {
    const { email } = passwordRecoveryDto;
    const recoveryCode = await nanoid();
    const user = await this.userModel.findOneAndUpdate({ email }, { 'codes.recoveryCode': recoveryCode }, { new: true }).lean().exec();
    if (!user)
      throw new HttpException({ code: StatusCode.EMAIL_NOT_EXIST, message: 'Email does not exist' }, HttpStatus.NOT_FOUND);
    await this.httpEmailService.sendEmailMailgun(user.email, user.username, 'Reset your password', MailgunTemplate.RESET_PASSWORD, {
      recipient_name: user.username,
      button_url: `${process.env.WEBSITE_URL}/reset-password?code=${recoveryCode}`
    });
    return { message: 'A password reset email has been sent' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const password = await this.hashPassword(resetPasswordDto.password);
    const user = await this.userModel.findOneAndUpdate({ 'codes.recoveryCode': resetPasswordDto.recoveryCode }, {
      $set: { password },
      $unset: { 'codes.recoveryCode': 1 }
    }).lean().exec();
    if (!user)
      throw new HttpException({ code: StatusCode.INVALID_CODE, message: 'The code is invalid or expired' }, HttpStatus.NOT_FOUND);
    return { message: 'Password has been successfully reseted' };
  }

  async createJwtToken(user: User | UserDocument) {
    const { _id, username, displayName, email, isVerified, isBanned } = user;
    const payload = { _id, username, displayName, email, isVerified, isBanned };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { secret: process.env.ACCESS_TOKEN_SECRET, expiresIn: ACCESS_TOKEN_EXPIRY }),
      this.jwtService.signAsync({ _id }, { secret: process.env.REFRESH_TOKEN_SECRET, expiresIn: REFRESH_TOKEN_EXPIRY })
    ]);
    const refreshTokenKey = `${CachePrefix.REFRESH_TOKEN}:${refreshToken}`;
    await this.redisCacheService.set(refreshTokenKey, { email: user.email, password: user.password }, { ttl: REFRESH_TOKEN_EXPIRY });
    return new Jwt(accessToken, refreshToken);
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    // Verify the refresh token
    const payload = await this.verifyRefreshToken(refreshTokenDto.refreshToken);
    // Find user by id
    const user = await this.findUserById(payload._id);
    if (!user)
      throw new HttpException({ code: StatusCode.UNAUTHORIZED_NO_USER, message: 'Not authorized because user not found' }, HttpStatus.UNAUTHORIZED);
    const refreshTokenKey = `${CachePrefix.REFRESH_TOKEN}:${refreshTokenDto.refreshToken}`;
    const refreshTokenValue = await this.redisCacheService.get<RefreshTokenWhitelist>(refreshTokenKey);
    // Refresh token has been revoked
    if (!refreshTokenValue)
      throw new HttpException({ code: StatusCode.TOKEN_REVOKED, message: 'Your refresh token has already been revoked' }, HttpStatus.UNAUTHORIZED);
    // If user changed their email or password
    else if (refreshTokenValue.email !== user.email || refreshTokenValue.password !== user.password)
      throw new HttpException({ code: StatusCode.CREDENTIALS_CHANGED, message: 'Your email or password has been changed, please login again' }, HttpStatus.UNAUTHORIZED);
    // Revoke and generate new tokens
    await this.redisCacheService.del(refreshTokenKey);
    return this.createJwtToken(user);
  }

  async revokeToken(refreshTokenDto: RefreshTokenDto) {
    // Verify the refresh token
    await this.verifyRefreshToken(refreshTokenDto.refreshToken);
    const refreshTokenKey = `${CachePrefix.REFRESH_TOKEN}:${refreshTokenDto.refreshToken}`;
    await this.redisCacheService.del(refreshTokenKey);
    return { message: 'Your refresh token has been revoked' };
  }

  hashPassword(password: string) {
    return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  }

  comparePassword(password: string, hashedPassword: string) {
    return bcrypt.compare(password, hashedPassword);
  }

  verifyAccessToken(accessToken: string) {
    return this.jwtService.verifyAsync(accessToken, { secret: process.env.ACCESS_TOKEN_SECRET });
  }

  verifyRefreshToken(refreshToken: string) {
    return this.jwtService.verifyAsync(refreshToken, { secret: process.env.REFRESH_TOKEN_SECRET });
  }

  findUserById(id: string, options?: FindUserOptions) {
    if (!options?.includeRoles)
      return this.userModel.findById(id).exec();
    return this.userModel.findById(id).populate('roles', { users: 0 }).exec();
  }

  findByIdCaching(id: string) {
    const cacheKey = `${CachePrefix.USER_BY_USER_ID}:${id}`;
    return this.redisCacheService.wrap<User>(cacheKey, () => {
      return this.userModel.findById(id).populate('roles', '-users').lean().exec();
    }, { ttl: 300 });
  }

  findByUsername(username: string) {
    return this.userModel.findOne({ username }).exec();
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
  }
}

class FindUserOptions {
  includeRoles?: boolean = true;
}

class RefreshTokenWhitelist {
  email: string;
  password: string;
}