import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users } from '../../db/schema';

@Injectable()
export class UsersRepository {
  constructor(@Inject('DRIZZLE') private readonly db: any) {}

  async create(user: any) {
    const [newUser] = await this.db
      .insert(users)
      .values({
        name: user.name,
        cpf: user.cpf,
        email: user.email,
        phone: user.phone,
      })
      .returning();

    return newUser;
  }

  async findByCpf(cpf: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.cpf, cpf));
    return user;
  }

  async findById(id: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async findAll() {
    return await this.db.select().from(users);
  }
}