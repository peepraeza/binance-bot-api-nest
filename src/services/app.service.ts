import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class AppService {

  constructor(
    @InjectRepository(UserRepository)
    private readonly userRepository: UserRepository,
  ) {
  }

  async getHello(id: string): Promise<string> {
    const user = await this.userRepository.findUserByLineUserId(id);
    if (user) {
      return 'HAVE ID';
    } else {
      return 'NOO';
    }
  }
}
