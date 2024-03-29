import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { nanoid } from 'nanoid/async';

import { HttpEmailService } from '../../common/modules/http-email/http-email.service';
import { PermissionsService } from '../../common/modules/permissions/permissions.service';
import { Redis2ndCacheService } from '../../common/modules/redis-2nd-cache/redis-2nd-cache.service';
import { RedisCacheService } from '../../common/modules/redis-cache/redis-cache.service';
import { User, UserDocument } from '../../schemas';
import { createSnowFlakeId } from '../../utils';
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
import { CachePrefix, MongooseConnection, SendgridTemplate, StatusCode } from '../../enums';
import { PASSWORD_HASH_ROUNDS } from '../../config';

@Injectable()
export class AuthService {
  constructor(@InjectModel(User.name, MongooseConnection.DATABASE_A) private userModel: Model<UserDocument>,
    private redisCacheService: RedisCacheService, private permissionsService: PermissionsService,
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
    user._id = await createSnowFlakeId();
    // Generate activation code
    user.activationCode = await nanoid(8);
    // Send a confirmation email and save user
    await Promise.all([
      user.save(),
      this.sendConfirmationEmail(user, user.activationCode)
    ]);
    return user.toObject<User>();
  }

  async sendConfirmationEmail(user: User | AuthUserDto, activationCode?: string) {
    if (user.verified) return;
    // Generate a new activation code
    if (!activationCode) {
      activationCode = await nanoid(8);
      user = await this.userModel.findOneAndUpdate({ _id: user._id }, { activationCode }, { new: true }).lean().exec();
    }
    await this.httpEmailService.sendEmailSendGrid(user.email, user.username, 'Confirm your email',
      SendgridTemplate.CONFIRM_EMAIL, {
      recipient_name: user.username,
      button_url: `${this.configService.get('WEBSITE_URL')}/confirm-email?id=${user._id}&code=${activationCode}`
    });
  }

  async confirmEmail(confirmEmailDto: ConfirmEmailDto) {
    const user = await this.userModel.findOneAndUpdate(
      { _id: confirmEmailDto.id, activationCode: confirmEmailDto.activationCode },
      { $set: { verified: true }, $unset: { activationCode: 1 } },
      { new: true }
    ).lean().exec();
    if (!user)
      throw new HttpException({ code: StatusCode.INVALID_CODE, message: 'The code is invalid or expired' }, HttpStatus.NOT_FOUND);
    await this.clearCachedAuthUser(user._id);
  }

  async passwordRecovery(passwordRecoveryDto: PasswordRecoveryDto) {
    const { email } = passwordRecoveryDto;
    const recoveryCode = await nanoid(8);
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
    const user = await this.userModel.findOneAndUpdate(
      { _id: resetPasswordDto.id, recoveryCode: resetPasswordDto.recoveryCode },
      { $set: { password }, $unset: { recoveryCode: 1 } },
      { new: true }
    ).lean().exec();
    if (!user)
      throw new HttpException({ code: StatusCode.INVALID_CODE, message: 'The code is invalid or expired' }, HttpStatus.NOT_FOUND);
  }

  async createJwtToken(user: User) {
    const payload = { _id: user._id.toString() };
    const accessTokenExpiry = +this.configService.get<string>('ACCESS_TOKEN_EXPIRY');
    const refreshTokenExpiry = +this.configService.get<string>('REFRESH_TOKEN_EXPIRY');
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { secret: this.configService.get('ACCESS_TOKEN_SECRET'), expiresIn: accessTokenExpiry }),
      nanoid(32)
    ]);
    const refreshTokenKey = `${CachePrefix.REFRESH_TOKEN}:${refreshToken}`;
    await this.redisCacheService.set(refreshTokenKey, { _id: user._id.toString() }, refreshTokenExpiry);
    return new Jwt(accessToken, refreshToken, refreshTokenExpiry, plainToInstance(UserDetails, user));
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const refreshTokenKey = `${CachePrefix.REFRESH_TOKEN}:${refreshTokenDto.refreshToken}`;
    const refreshTokenPayload = await this.redisCacheService.get<RefreshTokenPayload>(refreshTokenKey);
    // Refresh token has been revoked
    if (!refreshTokenPayload)
      throw new HttpException({ code: StatusCode.TOKEN_REVOKED, message: 'Your refresh token has already been revoked' }, HttpStatus.UNAUTHORIZED);
    // Expire this token after 1 minutes (Handle multiple refresh token requests at the same time)
    await this.redisCacheService.set(refreshTokenKey, refreshTokenPayload, 60);
    // Find user by id
    const user = await this.findUserById(BigInt(refreshTokenPayload._id), { includeRoles: true });
    if (!user)
      throw new HttpException({ code: StatusCode.UNAUTHORIZED_NO_USER, message: 'Not authorized because user not found' }, HttpStatus.UNAUTHORIZED);
    // If user changed their email or password
    //if (refreshTokenPayload.email !== user.email || refreshTokenPayload.password !== user.password)
    //  throw new HttpException({ code: StatusCode.CREDENTIALS_CHANGED, message: 'Your email or password has been changed, please login again' }, HttpStatus.UNAUTHORIZED);
    // Revoke and generate new tokens
    return this.createJwtToken(user.toObject());
  }

  async revokeToken(refreshTokenDto: RefreshTokenDto) {
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

  /*
  DEPRECATED, SWITCHED FROM JWT TO NANOID
  async verifyRefreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<RTPayload>(refreshToken, { secret: this.configService.get('REFRESH_TOKEN_SECRET') });
      return payload;
    } catch (e) {
      throw new HttpException({ code: StatusCode.UNAUTHORIZED, message: 'Unauthorized' }, HttpStatus.UNAUTHORIZED);
    }
  }
  */

  findUserById(id: bigint, options: FindUserOptions = { includeRoles: true }) {
    if (!options?.includeRoles)
      return this.userModel.findOne({ _id: id }).exec();
    return this.userModel.findOne({ _id: id })
      .populate({ path: 'roles', select: { _id: 1, name: 1, color: 1, permissions: 1, position: 1 }, options: { sort: { position: 1 } } })
      .exec();
  }

  async findUserAuthGuard(id: bigint) {
    const cacheKey = `${CachePrefix.USER_AUTH_GUARD}:${id}`;
    const user = await this.redis2ndCacheService.wrap<AuthUserDto>(cacheKey, async () => {
      const foundUser = await this.userModel.findOneAndUpdate({ _id: id },
        { $set: { lastActiveAt: new Date() } },
        { new: true }
      ).select({
        _id: 1, username: 1, email: 1, nickname: 1, roles: 1, verified: 1, banned: 1, owner: 1, settings: 1,
        lastActiveAt: 1, createdAt: 1, updatedAt: 1
      }).populate('roles', { users: 0 }).lean().exec();
      const authUser = plainToInstance(AuthUserDto, foundUser);
      authUser.granted = this.permissionsService.scanPermission(authUser);
      return authUser;
    }, 300);
    user._id = BigInt(user._id);
    return user;
  }

  clearCachedAuthUser(id: bigint) {
    if (!id)
      return;
    const cacheKey = `${CachePrefix.USER_AUTH_GUARD}:${id}`;
    return this.redis2ndCacheService.del(cacheKey);
  }

  clearCachedAuthUsers(ids: bigint[]) {
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

interface FindUserOptions {
  includeRoles?: boolean;
}

interface RefreshTokenPayload {
  _id: string;
  email: string;
  password: string;
}
