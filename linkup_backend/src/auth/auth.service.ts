import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const email = dto.email.toLowerCase();

    console.log('Processing signup:', { email, username: dto.username });

    try {
      if (await this.usersService.findByEmail(email)) {
        throw new ConflictException('Email already exists');
      }

      if (await this.usersService.findByUsername(dto.username)) {
        throw new ConflictException('Username already exists');
      }

      const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

      const user = await this.usersService.create({
        name: dto.name,
        username: dto.username,
        email,
        passwordHash,
        accountType: dto.accountType,
        country: dto.country,
        language: dto.language ?? 'en',
      });

      console.log('Signup successful:', { email, username: dto.username });

      return { user: this.usersService.sanitize(user) };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      console.error('Signup failed:', error);
      throw new InternalServerErrorException(
        'Unable to create account. Please try again.',
      );
    }
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken,
      user: this.usersService.sanitize(user),
    };
  }
}
