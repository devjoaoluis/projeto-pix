import { Module } from '@nestjs/common';
import db, { DB } from './db.provider';

@Module({
  providers: [
    {
      provide: 'DB',
      useValue: db,
    },
  ],
  exports: ['DB'],
})
export class DrizzleModule {}
