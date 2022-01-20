import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { plainToClass } from 'class-transformer';
import { LeanDocument, Model } from 'mongoose';
import { nanoid } from 'nanoid/async';

import { HttpEmailService } from '../../common/http-email/http-email.service';
import { PermissionsService } from '../../common/permissions/permissions.service';
import { Redis2ndCacheService } from '../../common/redis-2nd-cache/redis-2nd-cache.service';
import { RedisCacheService } from '../../common/redis-cache/redis-cache.service';
import { User, UserDocument } from '../../schemas/user.schema';
import { createSnowFlakeIdAsync } from '../../utils';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { UserDetails } from '../users/entities/user-details.entity';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { PasswordRecoveryDto } from './dto/password-recovery.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { ATPayload } from './entities/at-payload.entity';
import { Jwt } from './entities/jwt.enity';
import { RTPayload } from './entities/rt-payload.entity';
import { CachePrefix, SendgridTemplate, StatusCode } from '../../enums';
import { ACCESS_TOKEN_EXPIRY, PASSWORD_HASH_ROUNDS, REFRESH_TOKEN_EXPIRY } from '../../config';

@Injectable()
export class AuthService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>, private redisCacheService: RedisCacheService, private permissionsService: PermissionsService,
    private redis2ndCacheService: Redis2ndCacheService, private httpEmailService: HttpEmailService, private jwtService: JwtService,
    private configService: ConfigService) { }

  async authenticate(signInDto: SignInDto) {
    const user = await this.userModel.findOne({ email: signInDto.email })
      .populate({ path: 'roles', select: { _id: 1, name: 1, color: 1, permissions: 1, position: 1 }, options: { sort: { position: 1 } } })
      .lean().exec();
    if (!user)
      throw new HttpException({ code: StatusCode.EMAIL_NOT_EXIST, message: 'Email does not exist' }, HttpStatus.UNAUTHORIZED);
    const isValidPassword = await this.comparePassword(signInDto.password, user.password);
    if (!isValidPassword)
      throw new HttpException({ code: StatusCode.INCORRECT_PASSWORD, message: 'Incorrect password' }, HttpStatus.UNAUTHORIZED);
    return this.createJwtToken(user);
  }

  async signUp(signUpDto: SignUpDto) {
    const user = await this.createUser(signUpDto);
    return this.createJwtToken(user);
  }

  async createUser(signUpDto: SignUpDto) {
    signUpDto.password = await this.hashPassword(signUpDto.password);
    const user = new this.userModel(signUpDto);
    user._id = await createSnowFlakeIdAsync();
    // Generate activation code
    user.activationCode = await nanoid();
    // Send a confirmation email and save user
    await Promise.all([
      user.save(),
      this.sendConfirmationEmail(user, user.activationCode)
    ]);
    return user.toObject();
  }

  async sendConfirmationEmail(user: User | LeanDocument<User> | AuthUserDto, activationCode?: string) {
    // Generate a new activation code
    if (!activationCode) {
      activationCode = await nanoid();
      user = await this.userModel.findByIdAndUpdate(user._id, { activationCode }, { new: true }).lean().exec();
    }
    await this.httpEmailService.sendEmailSendGrid(user.email, user.username, 'Confirm your email',
      SendgridTemplate.CONFIRM_EMAIL, {
      recipient_name: user.username,
      button_url: `${this.configService.get('WEBSITE_URL')}/confirm-email?id=${user._id}&code=${activationCode}`
    });
  }

  async confirmEmail(confirmEmailDto: ConfirmEmailDto) {
    const user = await this.userModel.findOneAndUpdate({
      $and: [
        { _id: confirmEmailDto.id },
        { activationCode: confirmEmailDto.activationCode }
      ]
    }, {
      $set: { verified: true },
      $unset: { activationCode: 1 }
    }, {
      new: true
    }).lean().exec();
    if (!user)
      throw new HttpException({ code: StatusCode.INVALID_CODE, message: 'The code is invalid or expired' }, HttpStatus.NOT_FOUND);
  }

  async passwordRecovery(passwordRecoveryDto: PasswordRecoveryDto) {
    const { email } = passwordRecoveryDto;
    const recoveryCode = await nanoid();
    const user = await this.userModel.findOneAndUpdate({ email }, { recoveryCode }, { new: true }).lean().exec();
    if (!user)
      throw new HttpException({ code: StatusCode.EMAIL_NOT_EXIST, message: 'Email does not exist' }, HttpStatus.NOT_FOUND);
    await this.httpEmailService.sendEmailSendGrid(user.email, user.username, 'Reset your password',
      SendgridTemplate.RESET_PASSWORD, {
      recipient_name: user.username,
      button_url: `${this.configService.get('WEBSITE_URL')}/reset-password?id=${user._id}&code=${recoveryCode}`
    });
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const password = await this.hashPassword(resetPasswordDto.password);
    const user = await this.userModel.findOneAndUpdate({
      $and: [
        { _id: resetPasswordDto.id },
        { recoveryCode: resetPasswordDto.recoveryCode }
      ]
    }, {
      $set: { password },
      $unset: { recoveryCode: 1 }
    }, {
      new: true
    }).lean().exec();
    if (!user)
      throw new HttpException({ code: StatusCode.INVALID_CODE, message: 'The code is invalid or expired' }, HttpStatus.NOT_FOUND);
  }

  async createJwtToken(user: User | LeanDocument<User>) {
    const payload = { _id: user._id };
    const accessTokenExpiry = +this.configService.get<string>('ACCESS_TOKEN_EXPIRY') || ACCESS_TOKEN_EXPIRY;
    const refreshTokenExpiry = +this.configService.get<string>('REFRESH_TOKEN_EXPIRY') || REFRESH_TOKEN_EXPIRY;
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { secret: this.configService.get('ACCESS_TOKEN_SECRET'), expiresIn: accessTokenExpiry }),
      this.jwtService.signAsync(payload, { secret: this.configService.get('REFRESH_TOKEN_SECRET'), expiresIn: refreshTokenExpiry })
    ]);
    const refreshTokenKey = `${CachePrefix.REFRESH_TOKEN}:${refreshToken}`;
    await this.redisCacheService.set(refreshTokenKey, { email: user.email, password: user.password }, { ttl: refreshTokenExpiry });
    return new Jwt(accessToken, refreshToken, plainToClass(UserDetails, user));
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    // Verify the refresh token
    const payload = await this.verifyRefreshToken(refreshTokenDto.refreshToken);
    // Find user by id
    const user = await this.findUserById(payload._id, { includeRoles: true });
    if (!user)
      throw new HttpException({ code: StatusCode.UNAUTHORIZED_NO_USER, message: 'Not authorized because user not found' }, HttpStatus.UNAUTHORIZED);
    const refreshTokenKey = `${CachePrefix.REFRESH_TOKEN}:${refreshTokenDto.refreshToken}`;
    const refreshTokenValue = await this.redisCacheService.get<RefreshTokenWhitelist>(refreshTokenKey);
    // Refresh token has been revoked
    if (!refreshTokenValue)
      throw new HttpException({ code: StatusCode.TOKEN_REVOKED, message: 'Your refresh token has already been revoked' }, HttpStatus.UNAUTHORIZED);
    // Remove the refresh token
    await this.redisCacheService.del(refreshTokenKey);
    // If user changed their email or password
    if (refreshTokenValue.email !== user.email || refreshTokenValue.password !== user.password)
      throw new HttpException({ code: StatusCode.CREDENTIALS_CHANGED, message: 'Your email or password has been changed, please login again' }, HttpStatus.UNAUTHORIZED);
    // Revoke and generate new tokens
    return this.createJwtToken(user.toObject());
  }

  async revokeToken(refreshTokenDto: RefreshTokenDto) {
    // Verify the refresh token
    await this.verifyRefreshToken(refreshTokenDto.refreshToken);
    const refreshTokenKey = `${CachePrefix.REFRESH_TOKEN}:${refreshTokenDto.refreshToken}`;
    await this.redisCacheService.del(refreshTokenKey);
  }

  hashPassword(password: string) {
    return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  }

  comparePassword(password: string, hashedPassword: string) {
    return bcrypt.compare(password, hashedPassword);
  }

  async verifyAccessToken(accessToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<ATPayload>(accessToken, { secret: this.configService.get('ACCESS_TOKEN_SECRET') });
      return payload;
    } catch (e) {
      throw new HttpException({ code: StatusCode.UNAUTHORIZED, message: 'Unauthorized' }, HttpStatus.UNAUTHORIZED);
    }
  }

  async verifyRefreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<RTPayload>(refreshToken, { secret: this.configService.get('REFRESH_TOKEN_SECRET') });
      return payload;
    } catch (e) {
      throw new HttpException({ code: StatusCode.UNAUTHORIZED, message: 'Unauthorized' }, HttpStatus.UNAUTHORIZED);
    }
  }

  findUserById(id: string, options?: FindUserOptions) {
    if (!options?.includeRoles)
      return this.userModel.findById(id).exec();
    return this.userModel.findById(id)
      .populate({ path: 'roles', select: { _id: 1, name: 1, color: 1, permissions: 1, position: 1 }, options: { sort: { position: 1 } } })
      .exec();
  }

  findUserAuthGuard(id: string) {
    const cacheKey = `${CachePrefix.USER_AUTH_GUARD}:${id}`;
    return this.redis2ndCacheService.wrap<AuthUserDto>(cacheKey, async () => {
      const user = await this.userModel.findByIdAndUpdate(id,
        { $set: { lastActiveAt: new Date() } },
        { new: true }
      ).select({ password: 0, avatar: 0, codes: 0 }).populate('roles', { users: 0 }).lean().exec();
      const authUser = plainToClass(AuthUserDto, user);
      authUser.granted = this.permissionsService.scanPermission(authUser);
      return authUser;
    }, { ttl: 300 });
  }

  clearCachedAuthUser(id: string) {
    if (!id)
      return;
    const cacheKey = `${CachePrefix.USER_AUTH_GUARD}:${id}`;
    return this.redis2ndCacheService.del(cacheKey);
  }

  clearCachedAuthUsers(ids: string[]) {
    if (!ids?.length)
      return;
    return Promise.all(ids.map(id => this.clearCachedAuthUser(id)));
  }

  findByUsername(username: string) {
    return this.userModel.findOne({ username }).lean().exec();
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email }).lean().exec();
  }
}

class FindUserOptions {
  includeRoles?: boolean = true;
}

class RefreshTokenWhitelist {
  email: string;
  password: string;
}