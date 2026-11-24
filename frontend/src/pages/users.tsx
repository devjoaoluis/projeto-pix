import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useAction, useLookup, useUsers } from '@/hooks/use-api';
import { api } from '@/services/api';
import type { User } from '@/types/api';
import { userSchema } from '@/lib/validation';
import { cpfMask, phoneMask, digits, date } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import {
  Detail,
  Field,
  PageTitle,
  QueryState,
  SearchInput,
  Submit,
} from '@/components/shared';
export default function UsersPage() {
  const query = useUsers();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<User>();
  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', cpf: '', email: '', phone: '' },
  });
  const create = useAction(api.createUser, () => {
    setOpen(false);
    form.reset();
  });
  const lookup = useLookup(async (id: string) => {
    setSelected(await api.user(id));
  });
  const items =
    query.data?.filter((u) =>
      `${u.name} ${u.cpf} ${u.email} ${u.id}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) || [];
  return (
    <>
      <PageTitle
        title="Usuários"
        description="Pessoas que fazem parte da sua operação."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={17} /> Novo usuário
          </Button>
        }
      />
      <Card>
        <div className="toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nome, CPF, e-mail ou ID"
          />
          <span className="muted">{items.length} usuários</span>
        </div>
        <QueryState query={query} empty={!items.length}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>CPF</th>
                  <th>Contato</th>
                  <th>Cadastro</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="cell-main">
                        <span className="avatar">
                          {u.name.slice(0, 2).toUpperCase()}
                        </span>
                        <strong>{u.name}</strong>
                      </div>
                    </td>
                    <td>{cpfMask(u.cpf)}</td>
                    <td>
                      {u.email}
                      <small>{phoneMask(u.phone)}</small>
                    </td>
                    <td>{date(u.createdAt)}</td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={lookup.isPending}
                        onClick={() => lookup.mutate(u.id)}
                      >
                        Ver detalhes
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </Card>
      <Dialog open={open} onOpenChange={setOpen} title="Novo usuário">
        <form
          onSubmit={form.handleSubmit((v) =>
            create.mutate({ ...v, cpf: digits(v.cpf), phone: digits(v.phone) }),
          )}
          className="form"
        >
          {(['name', 'cpf', 'email', 'phone'] as const).map((name) => (
            <Field
              key={name}
              label={
                {
                  name: 'Nome completo',
                  cpf: 'CPF',
                  email: 'E-mail',
                  phone: 'Telefone',
                }[name]
              }
              error={form.formState.errors[name]?.message}
            >
              {(id) => (
                <input
                  id={id}
                  type={name === 'email' ? 'email' : 'text'}
                  autoComplete={
                    { name: 'name', cpf: 'off', email: 'email', phone: 'tel' }[
                      name
                    ]
                  }
                  aria-invalid={!!form.formState.errors[name]}
                  aria-describedby={`${id}-error`}
                  {...form.register(name, {
                    onChange: (e) => {
                      if (name === 'cpf')
                        form.setValue(name, cpfMask(e.target.value));
                      if (name === 'phone')
                        form.setValue(name, phoneMask(e.target.value));
                    },
                  })}
                />
              )}
            </Field>
          ))}
          {create.isError && (
            <p className="field-error" role="alert">
              {create.error.message}
            </p>
          )}
          <div className="dialog-actions">
            <Submit pending={create.isPending}>Cadastrar usuário</Submit>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={() => setSelected(undefined)}
        title="Detalhes do usuário"
      >
        {selected && (
          <Detail
            data={{
              Nome: selected.name,
              ID: selected.id,
              CPF: cpfMask(selected.cpf),
              'E-mail': selected.email,
              Telefone: phoneMask(selected.phone),
              Cadastro: date(selected.createdAt),
            }}
          />
        )}
      </Dialog>
    </>
  );
}
