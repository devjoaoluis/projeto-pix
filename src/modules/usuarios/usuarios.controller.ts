import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  async cadastrar(@Body() dto: CriarUsuarioDto) {
    return await this.usuariosService.cadastrar(dto);
  }

  @Get()
  async listar() {
    return await this.usuariosService.listar();
  }

  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    return await this.usuariosService.buscarPorId(id);
  }
}