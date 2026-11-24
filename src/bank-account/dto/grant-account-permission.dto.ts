import { IsIn, IsUUID } from 'class-validator';

export class GrantAccountPermissionDto {
  @IsUUID('all', { message: 'userId deve ser um UUID válido.' })
  userId!: string;

  @IsIn(['OWNER', 'COLLABORATOR', 'VIEWER'], {
    message: 'role deve ser OWNER, COLLABORATOR ou VIEWER.',
  })
  role!: 'OWNER' | 'COLLABORATOR' | 'VIEWER';
}
