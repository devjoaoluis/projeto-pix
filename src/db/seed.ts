import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DB_URL,
});

const db = drizzle(pool, { schema });

async function main() {
  console.log('Seeding database...');

  try {
    // Inserindo usuário de teste
    const [user] = await db
      .insert(schema.users)
      .values({
        name: 'Usuário Teste',
        cpf: '12345678901',
        email: 'teste@exemplo.com',
        phone: '11999999999',
      })
      .onConflictDoNothing()
      .returning();

    if (user) {
      console.log(`User created: ${user.name}`);

      // Inserindo conta bancária para o usuário
      const [bankAccount] = await db
        .insert(schema.bankAccounts)
        .values({
          userId: user.id,
          balance: '1000.00',
          status: 'ACTIVE',
        })
        .onConflictDoNothing()
        .returning();

      if (bankAccount) {
        console.log(`Bank account created with balance 1000.00`);

        // Inserindo chave pix
        await db
          .insert(schema.pixKeys)
          .values({
            bankAccountId: bankAccount.id,
            key: 'teste@exemplo.com',
            type: 'EMAIL',
          })
          .onConflictDoNothing();
          
        console.log('Pix key created: teste@exemplo.com');
      }
    } else {
      console.log('User already exists, skipping seed.');
    }

    console.log('Seeding completed!');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await pool.end();
  }
}

main();
