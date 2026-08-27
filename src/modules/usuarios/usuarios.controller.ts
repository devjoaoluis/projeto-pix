import { Controller, Post, Get, Param, Body, ParseIntPipe } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { Usuario } from '../../models/Usuario';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  cadastrar(@Body() dto: CriarUsuarioDto): Usuario {
    return this.usuariosService.cadastrar(dto);
  }

  @Get()
  listar(): Usuario[] {
    return this.usuariosService.listar();
  }

  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number): Usuario {
    return this.usuariosService.buscarPorId(id);
  }
}