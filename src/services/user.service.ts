import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRepository } from '../repositories/user.repository';
import { User } from '../entities/user.entity';
import { encrypt } from '../middlewares/cryptojs.middleware';

@Injectable()
export class UserService {

  constructor(
    @InjectRepository(UserRepository)
    private userRepository: UserRepository,
  ) {
  }

  async createUser(lineUserId: string): Promise<void> {
    const user = new User();
    const binanceKey = 'npdv5hOXwu4LD2KtAsvVQmRddmSAHUu2Ix7ZUTfnPFS7yzKbsJnwZM2wwu8pHE4T';
    const binanceSecret = '6zhbssWP7eqrAQyAdpTCOLVWWHbUq8CcFVd4iNJe4n5vdtmNQj8GWuekFgLjnYrf';
    const key = binanceKey + '|' + binanceSecret;
    user.lineUserId = lineUserId;
    user.binanceData = encrypt(key, lineUserId + '|' + 'pee');
    await this.userRepository.save(user);

  }
}
