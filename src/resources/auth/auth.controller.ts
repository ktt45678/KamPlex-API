import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-in')
  @ApiOperation({ summary: 'Authenticate a user' })
  @ApiOkResponse({ description: 'Return access token and refresh token.' })
  @ApiUnauthorizedResponse({ description: 'Incorrect username or password.' })
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.create(signInDto);
  }

  @Post('sign-up')
  @ApiOperation({ summary: 'Create a user' })
  @ApiCreatedResponse({ description: 'Create a new user and return its id.' })
  @ApiBadRequestResponse({ description: 'Bad request.' })
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.create(signUpDto);
  }

  @Post()
  create(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.create(createAuthDto);
  }

  @Get()
  findAll() {
    return this.authService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(+id, updateAuthDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.remove(+id);
  }
}
