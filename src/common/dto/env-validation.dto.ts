import { plainToInstance, Transform } from 'class-transformer';
import { IsEnum, IsInt, IsIP, IsNotEmpty, IsOptional, IsUrl, validateSync } from 'class-validator';

import { PORT, ADDRESS, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY, COOKIE_SECRET } from '../../config';

enum Environment {
  Development = 'development',
  Production = 'production'
}

class EnvironmentVariables {
  @IsOptional()
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsOptional()
  @IsInt()
  PORT: number = PORT;

  @IsOptional()
  @IsIP(4)
  ADDRESS: string = ADDRESS;

  @IsNotEmpty()
  DATABASE_URL: string;

  @IsNotEmpty()
  DATABASE_URL_B: string;

  @IsOptional()
  ACCESS_TOKEN_SECRET: string = ACCESS_TOKEN_SECRET;

  @IsOptional()
  REFRESH_TOKEN_SECRET: string = REFRESH_TOKEN_SECRET;

  @IsOptional()
  @IsInt()
  ACCESS_TOKEN_EXPIRY: number = ACCESS_TOKEN_EXPIRY;

  @IsOptional()
  @IsInt()
  REFRESH_TOKEN_EXPIRY: number = REFRESH_TOKEN_EXPIRY;

  @IsOptional()
  COOKIE_SECRET: string = COOKIE_SECRET;

  @IsNotEmpty()
  COOKIE_DOMAIN: string;

  @IsNotEmpty()
  REDIS_URL: string;

  @IsNotEmpty()
  REDIS_2ND_URL: string;

  @IsNotEmpty()
  REDIS_QUEUE_URL: string;

  @IsNotEmpty()
  REDIS_IO_URL: string;

  @IsNotEmpty()
  EMAIL_SENDER: string;

  @IsNotEmpty()
  EMAIL_FROM: string;

  @IsNotEmpty()
  SENDGRID_API_KEY: string;

  @IsNotEmpty()
  @IsUrl({ require_protocol: true, require_tld: false })
  WEBSITE_URL: string;

  @IsNotEmpty()
  @IsUrl({ require_protocol: true, require_tld: false })
  ORIGIN_URL: string;

  @Transform(({ value }) => {
    return (<string>value).split(',');
  })
  @IsOptional()
  @IsUrl({ require_protocol: true, require_tld: false }, { each: true })
  EXTRA_ORIGIN_URLS: string[];

  @IsNotEmpty()
  TMDB_ACCESS_TOKEN: string;

  @IsNotEmpty()
  CRYPTO_SECRET_KEY: string;

  @IsNotEmpty()
  ONEDRIVE_CLIENT_ID: string;

  @IsNotEmpty()
  ONEDRIVE_CLIENT_SECRET: string;

  @IsNotEmpty()
  @IsUrl({ require_protocol: true, require_tld: false })
  AZURE_STORAGE_URL: string;

  @IsNotEmpty()
  AZURE_STORAGE_CONNECTION_STRING: string;

  @IsNotEmpty()
  @IsUrl({ require_protocol: true, require_tld: false })
  IMAGE_PROXY_URL: string;

  @IsNotEmpty()
  @IsUrl({ require_protocol: true, require_tld: false })
  CONSUMET_API_URL: string;

  @IsNotEmpty()
  RECAPTCHA_SECRET: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}